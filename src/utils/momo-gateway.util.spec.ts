import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { MoMoGateway } from './momo-gateway.util';

const configValues = {
  MOMO_API_URL: 'https://momo.test/pay',
  MOMO_PARTNER_CODE: 'MOMO_PARTNER',
  MOMO_ACCESS_KEY: 'ACCESS_KEY',
  MOMO_SECRET_KEY: 'SECRET_KEY',
};

function createConfig(overrides: Record<string, string> = {}) {
  const values = { ...configValues, ...overrides };
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

function sign(rawData: string): string {
  return crypto
    .createHmac('sha256', configValues.MOMO_SECRET_KEY)
    .update(rawData)
    .digest('hex');
}

describe('MoMoGateway', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.useFakeTimers().setSystemTime(new Date('2026-06-05T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('throws a clear error when required MoMo config is missing', async () => {
    const gateway = new MoMoGateway(createConfig({ MOMO_SECRET_KEY: '' }));

    await expect(
      gateway.initiatePayment({
        paymentId: 10,
        amount: 120000,
        orderId: 99,
        returnUrl: 'https://shop.test/payment/return',
        notifyUrl: 'https://api.test/api/v1/payments/webhook/momo',
      }),
    ).rejects.toThrow('Missing MoMo configuration: MOMO_SECRET_KEY');
  });

  it('sends the expected initiate payment payload to MoMo', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      status: 200,
      headers: {
        get: jest.fn(() => 'application/json'),
      },
      json: jest.fn().mockResolvedValue({
        resultCode: 0,
        payUrl: 'https://momo.test/pay-url',
      }),
    });
    global.fetch = fetchMock;

    const gateway = new MoMoGateway(createConfig());
    const payUrl = await gateway.initiatePayment({
      paymentId: 10,
      amount: 120000.4,
      orderId: 99,
      returnUrl: 'https://shop.test/payment/return',
      notifyUrl: 'https://api.test/api/v1/payments/webhook/momo',
    });

    expect(payUrl).toBe('https://momo.test/pay-url');
    expect(fetchMock).toHaveBeenCalledWith(
      configValues.MOMO_API_URL,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const [, request] = fetchMock.mock.calls[0] as [
      string,
      { body: string },
    ];
    const payload = JSON.parse(request.body) as Record<string, unknown>;

    expect(payload).toMatchObject({
      partnerCode: configValues.MOMO_PARTNER_CODE,
      accessKey: configValues.MOMO_ACCESS_KEY,
      amount: 120000,
      orderId: '10_1780617600000',
      orderInfo: 'FShop Payment for Order #99',
      redirectUrl: 'https://shop.test/payment/return',
      ipnUrl: 'https://api.test/api/v1/payments/webhook/momo',
      requestId: '1780617600000',
      requestType: 'captureWallet',
      lang: 'vi',
    });
    expect(payload.signature).toEqual(expect.any(String));
  });

  it('verifies webhook signatures', () => {
    const gateway = new MoMoGateway(createConfig());
    const webhookData = {
      partnerCode: configValues.MOMO_PARTNER_CODE,
      orderId: '10_1780272000000',
      requestId: '1780272000000',
      amount: 120000,
      orderInfo: 'FShop Payment for Order #99',
      orderType: 'momo_wallet',
      transId: '123456',
      resultCode: 0,
      message: 'Successful.',
      payType: 'qr',
      responseTime: 1780272000010,
      extraData: '',
      signature: '',
    };
    const rawData =
      `accessKey=${configValues.MOMO_ACCESS_KEY}` +
      `&amount=${webhookData.amount}` +
      `&extraData=${webhookData.extraData}` +
      `&message=${webhookData.message}` +
      `&orderId=${webhookData.orderId}` +
      `&orderInfo=${webhookData.orderInfo}` +
      `&orderType=${webhookData.orderType}` +
      `&partnerCode=${webhookData.partnerCode}` +
      `&payType=${webhookData.payType}` +
      `&requestId=${webhookData.requestId}` +
      `&responseTime=${webhookData.responseTime}` +
      `&resultCode=${webhookData.resultCode}` +
      `&transId=${webhookData.transId}`;
    const validSignature = sign(rawData);
    const lastChar = validSignature.at(-1);
    const invalidSignature = `${validSignature.slice(0, -1)}${
      lastChar === '0' ? '1' : '0'
    }`;

    expect(gateway.verifyWebhookSignature(webhookData, validSignature)).toBe(
      true,
    );
    expect(gateway.verifyWebhookSignature(webhookData, invalidSignature)).toBe(
      false,
    );
  });
});
