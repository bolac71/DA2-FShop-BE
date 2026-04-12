/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as crypto from 'crypto';
import * as qs from 'qs';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface InitiateVNPayPaymentParams {
  paymentId: number;
  amount: number;
  orderId: number;
  returnUrl: string;
  ipAddress: string;
}

interface VNPayWebhookData {
  vnp_Amount: string;
  vnp_BankCode: string;
  vnp_BankTranNo: string;
  vnp_CardType: string;
  vnp_OrderInfo: string;
  vnp_PayDate: string;
  vnp_ResponseCode: string;
  vnp_TmnCode: string;
  vnp_TransactionNo: string;
  vnp_TransactionStatus: string;
  vnp_TxnRef: string;
  vnp_SecureHash: string;
}

/**
 * VNPay Payment Gateway Utility
 * Handles VNPay payment initiation and webhook signature verification
 */
@Injectable()
export class VNPayGateway {
  private readonly VNPAY_API_URL: string;
  private readonly TMN_CODE: string;
  private readonly SECRET_KEY: string;

  constructor(private configService: ConfigService) {
    this.VNPAY_API_URL = this.configService.get<string>('VNPAY_API_URL') || 'https://sandbox.vnpayment.vn/paygate/pay.html';
    this.TMN_CODE = this.configService.get<string>('VNPAY_TMOM_CODE') || '';
    this.SECRET_KEY = this.configService.get<string>('VNPAY_SECRET_KEY') || '';

    console.log('[VNPay] Gateway initialized with:', {
      VNPAY_API_URL: this.VNPAY_API_URL,
      TMN_CODE: this.TMN_CODE,
    });
  }

  /**
   * Generate HMAC-SHA512 signature for VNPay requests
   */
  private generateSignature(data: string, secretKey: string): string {
    return crypto.createHmac('sha512', secretKey).update(data).digest('hex');
  }

  /**
   * Initiate a VNPay payment request
   */
  initiatePayment(params: InitiateVNPayPaymentParams): string {
    const { paymentId, amount, orderId, returnUrl, ipAddress } = params;

    const locale = 'vn';
    const currCode = 'VND';
    const createDate = this.getVNPayDate();

    const vnp_Params: Record<string, string | number> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.TMN_CODE,
      vnp_Locale: locale,
      vnp_CurrCode: currCode,
      vnp_TxnRef: paymentId.toString(),
      vnp_OrderInfo: `FShop Order ${orderId}`,
      vnp_OrderType: 'other',
      vnp_Amount: Math.round(Number(amount) * 100).toString(), // VNPay expects amount * 100 (no decimal)
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddress,
      vnp_CreateDate: createDate,
    };

    // Sort parameters and encode values (matches VNPay official SDK)
    const sortedParams = this.sortObject(vnp_Params);
    const signData = qs.stringify(sortedParams, { encode: false });
    const hmac = this.generateSignature(signData, this.SECRET_KEY);

    console.log('[VNPay] signData:', signData);
    console.log('[VNPay] hmac:', hmac);

    sortedParams['vnp_SecureHash'] = hmac;
    const queryString = qs.stringify(sortedParams, { encode: false });
    const finalUrl = `${this.VNPAY_API_URL}?${queryString}`;

    console.log('[VNPay] finalUrl:', finalUrl);
    return finalUrl;
  }

  /**
   * Verify VNPay webhook signature (HMAC-SHA512)
   */
  verifyWebhookSignature(webhookData: Partial<VNPayWebhookData>, secureHash: string): boolean {
    const sortedData = this.sortObject(webhookData);
    const signData = qs.stringify(sortedData, { encode: false });
    const expectedHash = this.generateSignature(signData, this.SECRET_KEY);
    // VNPay may return hash in uppercase or lowercase — compare case-insensitively
    const normalizedExpected = expectedHash.toLowerCase();
    const normalizedReceived = (secureHash || '').toLowerCase();
    try {
      return crypto.timingSafeEqual(
        Buffer.from(normalizedExpected),
        Buffer.from(normalizedReceived),
      );
    } catch {
      return false;
    }
  }

  /**
   * Check if payment was successful based on response code
   */
  isPaymentSuccess(responseCode: string): boolean {
    return responseCode === '00';
  }

  /**
   * Get VNPay formatted timestamp
   */
  private getVNPayDate(): string {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  /**
   * Sort object keys and encode values — matches VNPay's official SDK sortObject:
   * keys are encodeURIComponent-sorted, values are encodeURIComponent'd with %20→+
   */
  private sortObject(obj: Record<string, any>): Record<string, any> {
    const sorted: Record<string, any> = {};
    const encodedKeys: string[] = [];

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        encodedKeys.push(encodeURIComponent(key));
      }
    }
    encodedKeys.sort();

    for (const encodedKey of encodedKeys) {
      const originalKey = decodeURIComponent(encodedKey);
      sorted[encodedKey] = encodeURIComponent(String(obj[originalKey])).replace(/%20/g, '+');
    }

    return sorted;
  }

  /**
   * Parse VNPay webhook response
   */
  parseWebhookData(queryParams: Record<string, string>): Partial<VNPayWebhookData> {
    return queryParams as any;
  }
}

