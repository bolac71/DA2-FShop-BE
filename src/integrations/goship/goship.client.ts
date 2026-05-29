/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-useless-catch */
import axios, { AxiosInstance } from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';
import GoshipConfig from 'src/configs/goship.config';

type GoshipAddress = {
  name?: string;
  phone?: string;
  street?: string;
  city: string;
  district: string;
  ward: string;
};

type GoshipParcel = {
  cod: number;
  amount: number;
  weight: number;
  width: number;
  height: number;
  length: number;
  metadata?: string;
};

type GoshipRateOption = {
  id: string;
  carrier_name?: string;
  carrier_logo?: string;
  service?: string;
  expected?: string;
  cod_fee?: number;
  total_fee?: number;
  total_amount?: number;
};

export type GoshipWebhookPayload = {
  gcode: string;
  code?: string;
  order_id?: string;
  status: string;
  status_text?: string;
  message?: string;
  description?: string;
  tracking_url?: string;
  fee?: string;
  cod?: string;
};

type GetRatesInput = {
  addressFrom: GoshipAddress;
  addressTo: GoshipAddress;
  parcel: GoshipParcel;
};

type CreateShipmentInput = {
  rateId: string;
  payer: 0 | 1;
  addressFrom: Required<
    Pick<
      GoshipAddress,
      'name' | 'phone' | 'street' | 'city' | 'district' | 'ward'
    >
  >;
  addressTo: Required<
    Pick<
      GoshipAddress,
      'name' | 'phone' | 'street' | 'city' | 'district' | 'ward'
    >
  >;
  parcel: GoshipParcel;
  idempotencyKey?: string;
};

export class GoshipClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: GoshipConfig.baseUrl,
      timeout: 10000,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${GoshipConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async createShipment(input: CreateShipmentInput) {
    const body = {
      shipment: {
        rate: input.rateId,
        payer: input.payer,
        address_from: {
          name: input.addressFrom.name,
          phone: input.addressFrom.phone,
          street: input.addressFrom.street,
          city: input.addressFrom.city,
          district: input.addressFrom.district,
          ward: input.addressFrom.ward,
        },
        address_to: {
          name: input.addressTo.name,
          phone: input.addressTo.phone,
          street: input.addressTo.street,
          city: input.addressTo.city,
          district: input.addressTo.district,
          ward: input.addressTo.ward,
        },
        parcel: {
          cod: input.parcel.cod,
          amount: input.parcel.amount,
          weight: input.parcel.weight,
          width: input.parcel.width,
          height: input.parcel.height,
          length: input.parcel.length,
          ...(input.parcel.metadata ? { metadata: input.parcel.metadata } : {}),
        },
      },
    };

    const res = await this.client.post('/shipments', body, {
      headers: input.idempotencyKey
        ? { 'Idempotency-Key': input.idempotencyKey }
        : undefined,
    });

    return res.data;
  }

  async getRates(input: GetRatesInput): Promise<GoshipRateOption[]> {
    console.log('Getting rates with input:', input);
    const body = {
      shipment: {
        address_from: {
          city: input.addressFrom.city,
          district: input.addressFrom.district,
          ward: input.addressFrom.ward,
        },
        address_to: {
          city: input.addressTo.city,
          district: input.addressTo.district,
          ward: input.addressTo.ward,
        },
        parcel: {
          cod: input.parcel.cod,
          amount: input.parcel.amount,
          weight: input.parcel.weight,
          width: input.parcel.width,
          height: input.parcel.height,
          length: input.parcel.length,
        },
      },
    };
    console.log('Request body for rates:', body);
    const res = await this.client.post('/rates', body);
    const payload = res.data;
    return Array.isArray(payload?.data) ? payload.data : [];
  }

  async getTracking(shipmentId: string) {
    const res = await this.client.get('/shipments/search', {
      params: { code: shipmentId },
    });
    return res.data;
  }

  async cancelShipment(shipmentId: string) {
    const res = await this.client.delete(`/shipments/${shipmentId}`);
    return res.data;
  }

  async listInvoices(params?: {
    page?: number;
    size?: number;
    from?: number;
    to?: number;
  }) {
    const res = await this.client.get('/invoices', { params });
    return res.data;
  }

  async listTransactions(params?: {
    page?: number;
    size?: number;
    from?: number;
    to?: number;
    code?: string;
  }) {
    const res = await this.client.get('/transactions', { params });
    return res.data;
  }

  verifyWebhookSignature(
    payload: unknown,
    receivedSignature: string | undefined,
  ): boolean {
    if (!receivedSignature || !GoshipConfig.webhookSecret) return false;

    const body = JSON.stringify(payload);
    const digest = createHmac('sha256', GoshipConfig.webhookSecret)
      .update(body)
      .digest('base64');

    const a = Buffer.from(digest);
    const b = Buffer.from(receivedSignature);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
}

export default new GoshipClient();
