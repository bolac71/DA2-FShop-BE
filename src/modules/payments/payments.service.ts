/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, BadRequestException, NotFoundException, ConflictException, HttpStatus, HttpException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Payment, PaymentRetry } from './entities';
import { Order } from 'src/modules/orders/entities/order.entity';
import { PaymentStatus, PaymentMethod, OrderStatus } from 'src/constants';
import { CreatePaymentRequestDto, PaymentResponseDto } from './dtos';
import { MoMoGateway } from 'src/utils/momo-gateway.util';
import { VNPayGateway } from 'src/utils/vnpay-gateway.util';

@Injectable()
export class PaymentsService {
  // Max 3 retry attempts for failed payments
  private readonly MAX_RETRY_COUNT = 3;
  // Payment expiry timeout: 15 minutes
  private readonly PAYMENT_EXPIRY_MINUTES = 15;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(PaymentRetry)
    private readonly paymentRetryRepository: Repository<PaymentRetry>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly momoGateway: MoMoGateway,
    private readonly vnpayGateway: VNPayGateway,
  ) {}

  /**
   * Initiate a payment for an order
   * Creates a Payment entity and returns redirect URL for payment gateway
   */
  async initiatePayment(
    userId: number,
    dto: CreatePaymentRequestDto,
    returnUrl: string,
    notifyUrl: string,
    ipAddress: string,
  ): Promise<PaymentResponseDto> {
    // Validate order exists and belongs to user
    const order = await this.orderRepository.findOne({
      where: { id: dto.orderId, user: { id: userId } },
    });

    if (!order) {
      throw new NotFoundException(`Order not found or unauthorized`);
    }

    // Check if order is still in PENDING status
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(`Order must be in PENDING status to initiate payment`);
    }

    // Check if payment already exists for this order
    const existingPayment = await this.paymentRepository.findOne({
      where: { orderId: dto.orderId, status: PaymentStatus.PENDING },
    });

    if (existingPayment && existingPayment.status === PaymentStatus.PENDING) {
      throw new ConflictException(`There is already a pending payment for this order`);
    }

    // For COD, create payment with COMPLETED status immediately
    if (dto.paymentMethod === PaymentMethod.COD) {
      const payment = this.paymentRepository.create({
        orderId: dto.orderId,
        userId,
        method: PaymentMethod.COD,
        amount: order.totalAmount,
        status: PaymentStatus.COMPLETED,
        requestId: `COD_${Date.now()}`,
      });

      // Explicitly ensure userId is set
      payment.userId = userId;
      await this.paymentRepository.save(payment);

      return this.mapPaymentToResponseDto(payment, '');
    }

    // Create payment record in PENDING status
    const requestId = `${Date.now()}`;
    const payment = this.paymentRepository.create({
      orderId: dto.orderId,
      userId,
      method: dto.paymentMethod,
      amount: order.totalAmount,
      status: PaymentStatus.PENDING,
      requestId,
    });

    // Explicitly ensure userId is set
    payment.userId = userId;
    await this.paymentRepository.save(payment);

    let redirectUrl = '';

    try {
      // Initialize payment with gateway
      if (dto.paymentMethod === PaymentMethod.MOMO) {
        redirectUrl = await this.momoGateway.initiatePayment({
          paymentId: payment.id,
          amount: order.totalAmount,
          orderId: order.id,
          returnUrl,
          notifyUrl,
        });
      } else if (dto.paymentMethod === PaymentMethod.VNPAY) {
        redirectUrl = this.vnpayGateway.initiatePayment({
          paymentId: payment.id,
          amount: order.totalAmount,
          orderId: order.id,
          returnUrl,
          ipAddress,
        });
      }
    } catch (error: any) {
      // Update payment status to FAILED if gateway initialization fails
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepository.save(payment);

      throw new HttpException(`Failed to initialize payment: ${error.message}`, HttpStatus.BAD_REQUEST);
    }

    const response = this.mapPaymentToResponseDto(payment, redirectUrl);
    return response;
  }

  /**
   * Process webhook from MoMo payment gateway
   */
  async processMoMoWebhook(webhookData: any, signature: string): Promise<{ status: string; message: string }> {
    try {
      // Verify signature
      if (!this.momoGateway.verifyWebhookSignature(webhookData, signature)) {
        throw new BadRequestException('Invalid MoMo webhook signature');
      }

      // Find payment by ID
      const payment = await this.paymentRepository.findOne({
        where: { id: parseInt(String(webhookData.orderId)) },
        relations: ['order'],
      });

      if (!payment) {
        throw new NotFoundException(`Payment not found: ${webhookData.orderId}`);
      }

      // Check for duplicate webhook (idempotent)
      if (payment.status !== PaymentStatus.PENDING) {
        return { status: 'ok', message: 'Payment already processed' };
      }

      // Update payment based on result
      if (this.momoGateway.isPaymentSuccess(webhookData.resultCode)) {
        payment.status = PaymentStatus.COMPLETED;
        payment.externalTransactionId = webhookData.transId;

        // Auto-transition order to CONFIRMED
        await this.autoTransitionOrderToConfirmed(payment.order);
      } else {
        payment.status = PaymentStatus.FAILED;
      }

      await this.paymentRepository.save(payment);

      return { status: 'ok', message: 'Webhook processed successfully' };
    } catch (error) {
      console.error('MoMo webhook error:', error);
      throw error;
    }
  }

  /**
   * Process webhook from VNPay payment gateway
   */
  async processVNPayWebhook(
    queryParams: Record<string, string>,
  ): Promise<{ RspCode: string; Message: string }> {
    try {
      const secureHash = queryParams.vnp_SecureHash;

      // Verify signature
      const dataToVerify = { ...queryParams };
      delete dataToVerify.vnp_SecureHash;
      delete dataToVerify.vnp_SecureHashType;

      if (!this.vnpayGateway.verifyWebhookSignature(dataToVerify, secureHash)) {
        throw new BadRequestException('Invalid VNPay webhook signature');
      }

      // Find payment by transaction reference
      const paymentId = parseInt(queryParams.vnp_TxnRef);
      const payment = await this.paymentRepository.findOne({
        where: { id: paymentId },
        relations: ['order'],
      });

      if (!payment) {
        throw new NotFoundException(`Payment not found: ${paymentId}`);
      }

      // Check for duplicate webhook (idempotent)
      if (payment.status !== PaymentStatus.PENDING) {
        return { RspCode: '00', Message: 'Payment already processed' };
      }

      // Update payment based on result
      if (this.vnpayGateway.isPaymentSuccess(queryParams.vnp_ResponseCode)) {
        payment.status = PaymentStatus.COMPLETED;
        payment.externalTransactionId = queryParams.vnp_TransactionNo;

        // Auto-transition order to CONFIRMED
        await this.autoTransitionOrderToConfirmed(payment.order);
      } else {
        payment.status = PaymentStatus.FAILED;
      }

      await this.paymentRepository.save(payment);

      return { RspCode: '00', Message: 'Webhook processed successfully' };
    } catch (error) {
      console.error('VNPay webhook error:', error);
      return { RspCode: '97', Message: 'Webhook processing error' };
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: number, userId: number): Promise<any> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId, user: { id: userId } },
    });

    if (!payment) {
      throw new NotFoundException(`Payment not found or unauthorized`);
    }

    return {
      paymentId: payment.id,
      orderId: payment.orderId,
      status: payment.status,
      method: payment.method,
      amount: payment.amount,
      externalTransactionId: payment.externalTransactionId,
      retryCount: payment.retryCount,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  /**
   * Retry a failed payment
   */
  async retryPayment(
    paymentId: number,
    userId: number,
    returnUrl: string,
    notifyUrl: string,
    ipAddress: string,
  ): Promise<PaymentResponseDto> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId, user: { id: userId } },
      relations: ['order'],
    });

    if (!payment) {
      throw new NotFoundException(`Payment not found or unauthorized`);
    }

    // Only failed payments can be retried
    if (payment.status !== PaymentStatus.FAILED) {
      throw new BadRequestException(`Only failed payments can be retried. Current status: ${payment.status}`);
    }

    // Check retry count limit
    if (payment.retryCount >= this.MAX_RETRY_COUNT) {
      throw new ConflictException(`Maximum retry attempts (${this.MAX_RETRY_COUNT}) exceeded`);
    }

    // Record retry attempt
    const retry = this.paymentRetryRepository.create({
      paymentId: payment.id,
      reason: 'User manual retry',
    });
    await this.paymentRetryRepository.save(retry);

    // Update payment status back to PENDING
    payment.status = PaymentStatus.PENDING;
    payment.retryCount += 1;

    let redirectUrl = '';

    try {
      // Re-initiate payment with gateway
      if (payment.method === PaymentMethod.MOMO) {
        redirectUrl = await this.momoGateway.initiatePayment({
          paymentId: payment.id,
          amount: payment.amount,
          orderId: payment.order.id,
          returnUrl,
          notifyUrl,
        });
      } else if (payment.method === PaymentMethod.VNPAY) {
        redirectUrl = this.vnpayGateway.initiatePayment({
          paymentId: payment.id,
          amount: payment.amount,
          orderId: payment.order.id,
          returnUrl,
          ipAddress,
        });
      }

      await this.paymentRepository.save(payment);
    } catch (error: any) {
      throw new HttpException(`Failed to retry payment: ${error.message}`, HttpStatus.BAD_REQUEST);
    }

    return this.mapPaymentToResponseDto(payment, redirectUrl);
  }

  /**
   * Auto-transition order from PENDING to CONFIRMED after successful payment
   * (Called internally when webhook confirms payment success)
   */
  private async autoTransitionOrderToConfirmed(order: Order): Promise<void> {
    if (order.status !== OrderStatus.PENDING) {
      return; // Only transition from PENDING
    }

    // Use transaction to ensure atomic update
    await this.dataSource.manager.transaction(async (manager) => {
      order.status = OrderStatus.CONFIRMED;
      await manager.save(order);
    });
  }

  /**
   * Verify MoMo return URL params and update payment status
   * Called when MoMo redirects user back after payment (browser redirect)
   */
  async verifyMoMoReturn(params: Record<string, string>): Promise<{
    success: boolean;
    paymentId: number;
    orderId: number;
    message: string;
  }> {
    const momoOrderId = params.orderId || '';
    const paymentId = parseInt(momoOrderId);

    if (!paymentId || isNaN(paymentId)) {
      throw new BadRequestException('Invalid orderId parameter');
    }

    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['order'],
    });

    if (!payment) {
      throw new NotFoundException(`Payment not found`);
    }

    // Verify signature to ensure params are authentic
    if (!this.momoGateway.verifyReturnSignature(params)) {
      throw new BadRequestException('Invalid MoMo return signature');
    }

    const resultCode = parseInt(params.resultCode ?? '-1');

    // Only update if still pending (idempotent)
    if (payment.status === PaymentStatus.PENDING) {
      if (resultCode === 0) {
        payment.status = PaymentStatus.COMPLETED;
        payment.externalTransactionId = params.transId;
        await this.paymentRepository.save(payment);
        await this.autoTransitionOrderToConfirmed(payment.order);
      } else {
        payment.status = PaymentStatus.FAILED;
        await this.paymentRepository.save(payment);
      }
    }

    return {
      success: payment.status === PaymentStatus.COMPLETED,
      paymentId: payment.id,
      orderId: payment.orderId,
      message: params.message || '',
    };
  }

  /**
   * Verify VNPay return URL params and update payment status
   */
  async verifyVNPayReturn(params: Record<string, string>): Promise<{
    success: boolean;
    paymentId: number;
    orderId: number;
    message: string;
  }> {
    const secureHash = params.vnp_SecureHash;
    const paymentId = parseInt(params.vnp_TxnRef ?? '0');

    if (!paymentId || isNaN(paymentId)) {
      throw new BadRequestException('Invalid vnp_TxnRef parameter');
    }

    const dataToVerify = { ...params };
    delete dataToVerify.vnp_SecureHash;
    delete dataToVerify.vnp_SecureHashType;

    if (!this.vnpayGateway.verifyWebhookSignature(dataToVerify, secureHash)) {
      throw new BadRequestException('Invalid VNPay return signature');
    }

    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['order'],
    });

    if (!payment) {
      throw new NotFoundException(`Payment not found`);
    }

    if (payment.status === PaymentStatus.PENDING) {
      if (this.vnpayGateway.isPaymentSuccess(params.vnp_ResponseCode)) {
        payment.status = PaymentStatus.COMPLETED;
        payment.externalTransactionId = params.vnp_TransactionNo;
        await this.paymentRepository.save(payment);
        await this.autoTransitionOrderToConfirmed(payment.order);
      } else {
        payment.status = PaymentStatus.FAILED;
        await this.paymentRepository.save(payment);
      }
    }

    return {
      success: payment.status === PaymentStatus.COMPLETED,
      paymentId: payment.id,
      orderId: payment.orderId,
      message: this.vnpayGateway.isPaymentSuccess(params.vnp_ResponseCode)
        ? 'Thanh toán thành công'
        : `Thanh toán thất bại (mã: ${params.vnp_ResponseCode})`,
    };
  }

  /**
   * Map Payment entity to DTO response
   */
  private mapPaymentToResponseDto(payment: Payment, redirectUrl: string): PaymentResponseDto {
    return {
      paymentId: payment.id,
      orderId: payment.orderId,
      status: payment.status,
      method: payment.method,
      amount: Number(payment.amount),
      externalTransactionId: payment.externalTransactionId,
      redirectUrl,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}
