/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, BadRequestException, NotFoundException, ConflictException, HttpStatus, HttpException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Payment, PaymentRetry } from './entities';
import { Order } from 'src/modules/orders/entities/order.entity';
import { PaymentStatus, PaymentMethod, OrderStatus } from 'src/constants';
import { CreatePaymentRequestDto, PaymentResponseDto } from './dtos';
import { MoMoGateway } from 'src/utils/momo-gateway.util';

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
      throw new HttpException(`Order not found or unauthorized`, HttpStatus.NOT_FOUND);
    }

    // Check if order is still in PENDING status
    if (order.status !== OrderStatus.PENDING) {
      throw new HttpException(`Order must be in PENDING status to initiate payment`, HttpStatus.BAD_REQUEST);
    }

    // Check if payment already exists for this order
    const existingPayment = await this.paymentRepository.findOne({
      where: { orderId: dto.orderId, status: PaymentStatus.PENDING },
    });

    if (existingPayment && existingPayment.status === PaymentStatus.PENDING) {
      throw new HttpException(`There is already a pending payment for this order`, HttpStatus.CONFLICT);
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
        throw new HttpException('Invalid MoMo webhook signature', HttpStatus.BAD_REQUEST);
      }

      // Find payment by ID
      const payment = await this.paymentRepository.findOne({
        where: { id: parseInt(String(webhookData.orderId)) },
        relations: ['order'],
      });

      if (!payment) {
        throw new HttpException(`Payment not found: ${webhookData.orderId}`, HttpStatus.NOT_FOUND);
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
   * Get payment status
   */
  async getPaymentStatus(paymentId: number, userId: number): Promise<any> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId, user: { id: userId } },
    });

    if (!payment) {
      throw new HttpException(`Payment not found or unauthorized`, HttpStatus.NOT_FOUND);
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
      throw new HttpException(`Payment not found or unauthorized`, HttpStatus.NOT_FOUND);
    }

    // Only failed payments can be retried
    if (payment.status !== PaymentStatus.FAILED) {
      throw new HttpException(`Only failed payments can be retried. Current status: ${payment.status}`, HttpStatus.BAD_REQUEST);
    }

    // Check retry count limit
    if (payment.retryCount >= this.MAX_RETRY_COUNT) {
      throw new HttpException(`Maximum retry attempts (${this.MAX_RETRY_COUNT}) exceeded`, HttpStatus.CONFLICT);
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
      throw new HttpException('Invalid orderId parameter', HttpStatus.BAD_REQUEST);
    }

    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['order'],
    });

    if (!payment) {
      throw new HttpException(`Payment not found`, HttpStatus.NOT_FOUND);
    }

    // Verify signature to ensure params are authentic
    if (!this.momoGateway.verifyReturnSignature(params)) {
      throw new HttpException('Invalid MoMo return signature', HttpStatus.BAD_REQUEST);
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
