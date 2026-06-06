/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface InitiateMoMoPaymentParams {
  paymentId: number;
  amount: number;
  orderId: number;
  returnUrl: string;
  notifyUrl: string;
}

interface AtmCardInfo {
  cardNumber: string;
  cardFullName: string;
  cardIssueDate: string;
}

interface InitiateAtmTransactionParams extends InitiateMoMoPaymentParams {
  partnerClientId: string;
}

interface ProcessAtmPaymentParams {
  mToken: string;
  amount: number;
  orderId: string;
  requestId: string;
  cardInfo: AtmCardInfo;
}

interface MoMoWebhookData {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  orderInfo: string;
  orderType: string;
  transId: string;
  resultCode: number;
  message: string;
  payType: string;
  responseTime: number;
  extraData: string;
  signature: string;
}

/**
 * MoMo Payment Gateway Utility
 * Handles MoMo payment initiation and webhook signature verification
 */
@Injectable()
export class MoMoGateway {
  private readonly MOMO_API_URL: string;
  private readonly PARTNER_CODE: string;
  private readonly ACCESS_KEY: string;
  private readonly SECRET_KEY: string;
  private readonly REQUEST_TYPE: string;
  private readonly PARTNER_NAME: string;
  private readonly STORE_ID: string;
  private readonly TEST_EMAIL: string;

  constructor(private configService: ConfigService) {
    this.MOMO_API_URL = this.configService.get<string>('MOMO_API_URL') || '';
    this.PARTNER_CODE = this.configService.get<string>('MOMO_PARTNER_CODE') || '';
    this.ACCESS_KEY = this.configService.get<string>('MOMO_ACCESS_KEY') || '';
    this.SECRET_KEY = this.configService.get<string>('MOMO_SECRET_KEY') || '';
    this.REQUEST_TYPE = this.configService.get<string>('MOMO_REQUEST_TYPE') || 'payWithCC';
    this.PARTNER_NAME = this.configService.get<string>('MOMO_PARTNER_NAME') || 'Test';
    this.STORE_ID = this.configService.get<string>('MOMO_STORE_ID') || 'MoMoTestStore';
    this.TEST_EMAIL = this.configService.get<string>('MOMO_TEST_EMAIL') || 'test@example.com';

    console.log('[MoMo] Gateway initialized with:', {
      MOMO_API_URL: this.MOMO_API_URL,
      REQUEST_TYPE: this.REQUEST_TYPE,
      hasPartnerCode: Boolean(this.PARTNER_CODE),
      hasAccessKey: Boolean(this.ACCESS_KEY),
      hasSecretKey: Boolean(this.SECRET_KEY),
    });
  }

  /**
   * Generate HMAC-SHA256 signature for MoMo requests
   */
  private generateSignature(data: string, secretKey: string): string {
    return crypto.createHmac('sha256', secretKey).update(data).digest('hex');
  }

  private validateConfig() {
    const missingKeys = [
      ['MOMO_API_URL', this.MOMO_API_URL],
      ['MOMO_PARTNER_CODE', this.PARTNER_CODE],
      ['MOMO_ACCESS_KEY', this.ACCESS_KEY],
      ['MOMO_SECRET_KEY', this.SECRET_KEY],
    ]
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missingKeys.length > 0) {
      throw new Error(`Missing MoMo configuration: ${missingKeys.join(', ')}`);
    }
  }

  /**
   * Initiate a MoMo payment request
   */
  async initiatePayment(params: InitiateMoMoPaymentParams): Promise<string> {
    this.validateConfig();

    const { paymentId, amount, orderId, returnUrl, notifyUrl } = params;

    const requestId = `${Date.now()}`;
    const orderInfo = `FShop Payment for Order #${orderId}`;
    // MoMo requires integer amount (VND has no decimal)
    const amountInt = Math.round(Number(amount));
    // MoMo orderId must be globally unique per request — append timestamp to avoid conflicts
    // parseInt() on webhook side still extracts paymentId correctly (e.g. "13_1234567" → 13)
    const momoOrderId = `${paymentId}_${requestId}`;

    // Create raw signature data
    const rawSignature = `accessKey=${this.ACCESS_KEY}&amount=${amountInt}&extraData=&ipnUrl=${notifyUrl}&orderId=${momoOrderId}&orderInfo=${orderInfo}&partnerCode=${this.PARTNER_CODE}&redirectUrl=${returnUrl}&requestId=${requestId}&requestType=${this.REQUEST_TYPE}`;

    const signature = this.generateSignature(rawSignature, this.SECRET_KEY);

    const requestPayload: Record<string, unknown> = {
      partnerCode: this.PARTNER_CODE,
      partnerName: this.PARTNER_NAME,
      storeId: this.STORE_ID,
      requestId,
      amount: amountInt,
      orderId: momoOrderId,
      orderInfo,
      redirectUrl: returnUrl,
      ipnUrl: notifyUrl,
      extraData: '',
      requestType: this.REQUEST_TYPE,
      signature,
      lang: 'vi',
    };

    if (this.REQUEST_TYPE === 'payWithCC') {
      requestPayload.userInfo = {
        email: this.TEST_EMAIL,
      };
      requestPayload.autoCapture = true;
    }

    try {
      console.log('[MoMo] Initiating payment with config:', {
        MOMO_API_URL: this.MOMO_API_URL,
        PARTNER_CODE: this.PARTNER_CODE,
        requestType: this.REQUEST_TYPE,
        amount,
        orderId: paymentId,
      });

      const response = await fetch(this.MOMO_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      console.log('[MoMo] Response status:', response.status);

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const rawText = await response.text();
        console.error('[MoMo] Non-JSON response:', rawText.substring(0, 200));
        throw new Error(
          `MoMo API returned non-JSON response (${response.status}). ` +
          `Endpoint: ${this.MOMO_API_URL}. ` +
          `Check your MoMo credentials and API endpoint.`,
        );
      }

      const data = await response.json();

      console.log('[MoMo] Response data:', {
        resultCode: data.resultCode,
        message: data.message,
        requestId: data.requestId,
        orderId: data.orderId,
        payUrlHost: data.payUrl ? new URL(data.payUrl).host : null,
        payUrlPath: data.payUrl ? new URL(data.payUrl).pathname : null,
        hasDeeplink: Boolean(data.deeplink),
      });

      if (data.resultCode === 0) {
        // Return the payment link for user to complete payment
        return data.payUrl || data.deeplink;
      } else {
        throw new Error(`MoMo API error: ${data.message}`);
      }
    } catch (error) {
      console.error('[MoMo] Error:', error);
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initiate MoMo payment: ${msg}`);
    }
  }

  async initiateAtmTransaction(params: InitiateAtmTransactionParams): Promise<{
    mToken: string;
    momoOrderId: string;
    requestId: string;
  }> {
    this.validateConfig();

    const { paymentId, amount, orderId, returnUrl, notifyUrl, partnerClientId } = params;
    const requestId = `${Date.now()}`;
    const orderInfo = `pay with MoMo ATM`;
    const amountInt = Math.round(Number(amount));
    const momoOrderId = `${paymentId}_${requestId}`;
    const requestType = 'initiate';
    const extraData = '';

    const rawSignature =
      `accessKey=${this.ACCESS_KEY}&amount=${amountInt}&extraData=${extraData}` +
      `&ipnUrl=${notifyUrl}&orderId=${momoOrderId}&orderInfo=${orderInfo}` +
      `&partnerClientId=${partnerClientId}&partnerCode=${this.PARTNER_CODE}` +
      `&redirectUrl=${returnUrl}&requestId=${requestId}&requestType=${requestType}`;
    const signature = this.generateSignature(rawSignature, this.SECRET_KEY);

    const requestPayload = {
      partnerCode: this.PARTNER_CODE,
      partnerName: this.PARTNER_NAME,
      storeId: this.STORE_ID,
      requestType,
      partnerClientId,
      ipnUrl: notifyUrl,
      redirectUrl: returnUrl,
      orderId: momoOrderId,
      amount: amountInt,
      lang: 'vi',
      orderInfo,
      requestId,
      extraData,
      signature,
    };

    const response = await fetch(this.MOMO_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });

    const data = await response.json();
    console.log('[MoMo ATM] Initiate response:', {
      resultCode: data.resultCode,
      message: data.message,
      hasMToken: Boolean(data.mToken),
    });

    if (data.resultCode !== 0 || !data.mToken) {
      throw new Error(`MoMo ATM initiate error: ${data.message || 'missing mToken'}`);
    }

    return { mToken: data.mToken, momoOrderId, requestId };
  }

  async processAtmPayment(params: ProcessAtmPaymentParams): Promise<string> {
    const { mToken, amount, orderId, requestId, cardInfo } = params;
    const amountInt = Math.round(Number(amount));

    const response = await fetch(this.MOMO_API_URL.replace('/create', '/pay'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        mToken,
        partnerCode: this.PARTNER_CODE,
        orderId,
        requestId,
      },
      body: JSON.stringify({
        cardInfo,
        amount: amountInt,
        requestType: 'payWithATM',
        generateCardToken: false,
        lang: 'vi',
      }),
    });

    const data = await response.json();
    console.log('[MoMo ATM] Pay response:', {
      resultCode: data.resultCode,
      message: data.message,
      hasPayUrl: Boolean(data.payUrl),
    });

    if (data.resultCode !== 0 || !data.payUrl) {
      throw new Error(`MoMo ATM pay error: ${data.message || 'missing payUrl'}`);
    }

    return data.payUrl;
  }

  /**
   * Verify MoMo return URL signature (same algorithm as webhook)
   * Used when MoMo redirects user back after payment
   */
  verifyReturnSignature(params: Record<string, string>): boolean {
    const { signature, ...rest } = params;
    const rawData = `accessKey=${this.ACCESS_KEY}&amount=${rest.amount}&extraData=${rest.extraData ?? ''}&message=${rest.message}&orderId=${rest.orderId}&orderInfo=${rest.orderInfo}&orderType=${rest.orderType}&partnerCode=${rest.partnerCode}&payType=${rest.payType ?? ''}&requestId=${rest.requestId}&responseTime=${rest.responseTime}&resultCode=${rest.resultCode}&transId=${rest.transId}`;
    const expectedSignature = this.generateSignature(rawData, this.SECRET_KEY);
    try {
      return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature || ''));
    } catch {
      return false;
    }
  }

  /**
   * Verify MoMo webhook signature (HMAC-SHA256)
   */
  verifyWebhookSignature(webhookData: MoMoWebhookData, signature: string): boolean {
    // Create raw data for signature verification (exclude signature field)
    const rawData = `accessKey=${this.ACCESS_KEY}&amount=${webhookData.amount}&extraData=${webhookData.extraData}&message=${webhookData.message}&orderId=${webhookData.orderId}&orderInfo=${webhookData.orderInfo}&orderType=${webhookData.orderType}&partnerCode=${webhookData.partnerCode}&payType=${webhookData.payType}&requestId=${webhookData.requestId}&responseTime=${webhookData.responseTime}&resultCode=${webhookData.resultCode}&transId=${webhookData.transId}`;

    const expectedSignature = this.generateSignature(rawData, this.SECRET_KEY);

    // Prevent timing attacks by comparing all characters
    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
  }

  /**
   * Parse MoMo webhook response
   */
  static parseWebhookData(body: unknown): MoMoWebhookData {
    return body as MoMoWebhookData;
  }

  /**
   * Check if payment was successful based on result code
   */
  isPaymentSuccess(resultCode: number): boolean {
    return resultCode === 0;
  }
}
