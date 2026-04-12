/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
  HttpStatus,
  HttpException,
  ParseIntPipe,
  HttpCode,
} from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiPaymentRequiredResponse,
  ApiConflictResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { CreatePaymentRequestDto, PaymentResponseDto } from './dtos';

@Controller('payments')
@ApiTags('Payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * POST /payments/initiate
   * Initiate a payment for an order
   * Returns redirect URL to payment gateway
   */
  @UseGuards(JwtAuthGuard)
  @Post('initiate')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Initiate a payment for an order',
    description:
      'Creates a payment record and returns a redirect URL to complete payment on MoMo/VNPay. For COD, payment is completed immediately.',
  })
  @ApiQuery({
    name: 'returnUrl',
    type: String,
    required: true,
    description: 'URL to redirect after payment is completed',
    example: 'http://localhost:5173/payment/return',
  })
  @ApiQuery({
    name: 'notifyUrl',
    type: String,
    required: true,
    description: 'URL for payment gateway to send webhook notifications',
    example: 'http://localhost:4000/api/v1/payments/webhook/momo',
  })
  @ApiCreatedResponse({
    description: 'Payment initiated successfully',
    type: PaymentResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Missing required parameters or invalid request',
  })
  @ApiNotFoundResponse({
    description: 'Order not found or user not authorized',
  })
  @ApiPaymentRequiredResponse({
    description: 'Order must be in PENDING status',
  })
  @ApiConflictResponse({
    description: 'Payment already exists for this order',
  })
  async initiatePayment(
    @Request() req,
    @Body() dto: CreatePaymentRequestDto,
    @Query('returnUrl') returnUrl: string,
    @Query('notifyUrl') notifyUrl: string,
  ) {
    if (!returnUrl) {
      throw new HttpException('returnUrl query parameter is required', HttpStatus.BAD_REQUEST);
    }
    if (!notifyUrl) {
      throw new HttpException('notifyUrl query parameter is required', HttpStatus.BAD_REQUEST);
    }

    const rawIp = (req.ip || req.connection.remoteAddress || '127.0.0.1') as string;
    // Normalize IPv6 loopback/mapped to IPv4 (VNPay requires valid IPv4)
    const ipAddress = rawIp === '::1' ? '127.0.0.1'
      : rawIp.startsWith('::ffff:') ? rawIp.slice(7)
      : rawIp;
    const { sub } = req['user'];
    return this.paymentsService.initiatePayment(
      (sub as number),
      dto,
      returnUrl,
      notifyUrl,
      ipAddress,
    );
  }

  /**
   * GET /payments/momo/verify-return
   * Verify MoMo return URL params after user completes payment
   * Updates payment & order status based on MoMo redirect result
   */
  @Get('momo/verify-return')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Verify MoMo return URL after payment',
    description: 'Called by frontend after MoMo redirects user back. Verifies signature and updates payment/order status.',
  })
  @ApiOkResponse({
    description: 'Verification result',
    schema: { example: { success: true, paymentId: 1, orderId: 1, message: '' } },
  })
  async verifyMoMoReturn(@Query() queryParams: Record<string, string>) {
    return this.paymentsService.verifyMoMoReturn(queryParams);
  }

  /**
   * GET /payments/vnpay/verify-return
   * Verify VNPay return URL params after user completes payment
   */
  @Get('vnpay/verify-return')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Verify VNPay return URL after payment',
    description: 'Called by frontend after VNPay redirects user back. Verifies signature and updates payment/order status.',
  })
  @ApiOkResponse({
    description: 'Verification result',
    schema: { example: { success: true, paymentId: 1, orderId: 1, message: '' } },
  })
  async verifyVNPayReturn(@Query() queryParams: Record<string, string>) {
    return this.paymentsService.verifyVNPayReturn(queryParams);
  }

  /**
   * GET /payments/vnpay/return
   * VNPay redirects here after payment (backend handles verification then redirects to frontend)
   * This avoids needing to expose the frontend via ngrok
   */
  @Get('vnpay/return')
  @ApiOperation({
    summary: 'VNPay return URL handler (backend redirect)',
    description: 'VNPay redirects here after payment. Verifies signature, updates DB, then redirects to frontend with result.',
  })
  async vnpayReturn(
    @Query() queryParams: Record<string, string>,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get<string>('FE_URL') || 'http://localhost:5173';
    try {
      const result = await this.paymentsService.verifyVNPayReturn(queryParams);
      const url = result.success
        ? `${frontendUrl}/payment/return?success=true&orderId=${result.orderId}&paymentId=${result.paymentId}`
        : `${frontendUrl}/payment/return?success=false&message=${encodeURIComponent(result.message)}&orderId=${result.orderId}&paymentId=${result.paymentId}`;
      console.log('[VNPay] Redirecting to:', url);
      return res.redirect(302, url);
    } catch (error) {
      console.error('[VNPay] Return verification error:', error);
      const url = `${frontendUrl}/payment/return?success=false&message=${encodeURIComponent('Xác nhận thanh toán thất bại')}`;
      return res.redirect(302, url);
    }
  }

  /**
   * POST /payments/webhook/momo
   * MoMo payment gateway webhook receiver
   * Verifies signature and updates payment status
   */
  @Post('webhook/momo')
  @HttpCode(200)
  @ApiOperation({
    summary: 'MoMo payment webhook callback',
    description:
      'Webhook endpoint for MoMo to send payment status updates. Auto-transitions order to CONFIRMED if payment successful.',
  })
  @ApiOkResponse({
    description: 'Webhook processed successfully',
    schema: { example: { status: 'ok', message: 'Webhook processed successfully' } },
  })
  @ApiBadRequestResponse({
    description: 'Invalid webhook signature or missing signature',
  })
  @ApiNotFoundResponse({
    description: 'Payment not found',
  })
  async momoWebhook(@Body() webhookData: any) {
    const signature = (webhookData.signature as string);
    if (!signature) {
      throw new HttpException('Missing signature in webhook', HttpStatus.BAD_REQUEST);
    }

    const result = await this.paymentsService.processMoMoWebhook(webhookData, signature);

    return result;
  }

  /**
   * POST /payments/webhook/vnpay
   * VNPay payment gateway webhook receiver
   * Verifies signature and updates payment status
   * VNPay sends data as query parameters, not body
   */
  @Get('webhook/vnpay')
  @HttpCode(200)
  @ApiOperation({
    summary: 'VNPay payment webhook callback',
    description:
      'Webhook endpoint for VNPay to send payment status updates via query parameters. Auto-transitions order to CONFIRMED if payment successful.',
  })
  @ApiOkResponse({
    description: 'Webhook processed successfully',
    schema: { example: { RspCode: '00', Message: 'Webhook processed successfully' } },
  })
  @ApiBadRequestResponse({
    description: 'Invalid webhook signature or missing signature',
  })
  @ApiNotFoundResponse({
    description: 'Payment not found',
  })
  async vnpayWebhook(@Query() queryParams: Record<string, string>) {
    if (!queryParams.vnp_SecureHash) {
      throw new HttpException('Missing vnp_SecureHash in webhook', HttpStatus.BAD_REQUEST);
    }

    const result = await this.paymentsService.processVNPayWebhook(queryParams);

    return result;
  }

  /**
   * GET /payments/:paymentId
   * Get payment status
   * User can only check their own payments
   */
  @UseGuards(JwtAuthGuard)
  @Get(':paymentId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get payment status',
    description: 'Retrieve current payment status including transaction ID and retry count',
  })
  @ApiOkResponse({
    description: 'Payment status retrieved successfully',
    type: PaymentResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Payment not found or user not authorized',
  })
  async getPaymentStatus(
    @Request() req,
    @Param('paymentId', ParseIntPipe) paymentId: number,
  ) {
    const { sub } = req['user'];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.paymentsService.getPaymentStatus(paymentId, (sub as number));
  }

  /**
   * POST /payments/:paymentId/retry
   * Retry a failed payment
   * Returns new redirect URL to payment gateway
   */
  @UseGuards(JwtAuthGuard)
  @Post(':paymentId/retry')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Retry a failed payment',
    description:
      'Retry failed payment (max 3 attempts allowed). Returns new redirect URL to payment gateway.',
  })
  @ApiQuery({
    name: 'returnUrl',
    type: String,
    required: true,
    description: 'URL to redirect after payment is completed',
    example: 'http://localhost:5173/payment/return',
  })
  @ApiQuery({
    name: 'notifyUrl',
    type: String,
    required: true,
    description: 'URL for payment gateway to send webhook notifications',
    example: 'http://localhost:4000/api/v1/payments/webhook/momo',
  })
  @ApiCreatedResponse({
    description: 'Payment retry initiated successfully',
    type: PaymentResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Payment cannot be retried (only FAILED payments can be retried, or missing query parameters)',
  })
  @ApiNotFoundResponse({
    description: 'Payment not found or user not authorized',
  })
  @ApiConflictResponse({
    description: 'Maximum retry attempts exceeded',
  })
  async retryPayment(
    @Request() req,
    @Param('paymentId', ParseIntPipe) paymentId: number,
    @Query('returnUrl') returnUrl: string,
    @Query('notifyUrl') notifyUrl: string,
  ) {
    if (!returnUrl) {
      throw new HttpException('returnUrl query parameter is required', HttpStatus.BAD_REQUEST);
    }
    if (!notifyUrl) {
      throw new HttpException('notifyUrl query parameter is required', HttpStatus.BAD_REQUEST);
    }

    const rawIp = (req.ip || req.connection.remoteAddress || '127.0.0.1') as string;
    const ipAddress = rawIp === '::1' ? '127.0.0.1'
      : rawIp.startsWith('::ffff:') ? rawIp.slice(7)
      : rawIp;
    const { sub } = req['user'];
    return this.paymentsService.retryPayment(
      paymentId,
      (sub as number),
      returnUrl,
      notifyUrl,
      ipAddress,
    );
  }
}
