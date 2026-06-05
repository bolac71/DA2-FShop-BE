import { Injectable } from '@nestjs/common';
import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  Registry,
} from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  private readonly httpRequestsTotal: Counter<string>;
  private readonly httpRequestDuration: Histogram<string>;
  private readonly ordersCreatedTotal: Counter<string>;
  private readonly paymentsInitiatedTotal: Counter<string>;
  private readonly moderationDecisionsTotal: Counter<string>;

  constructor() {
    this.registry.setDefaultLabels({ app: 'fshop_backend' });
    collectDefaultMetrics({
      register: this.registry,
      prefix: 'fshop_backend_',
    });

    this.httpRequestsTotal = new Counter({
      name: 'fshop_backend_http_requests_total',
      help: 'Total HTTP requests handled by the backend',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'fshop_backend_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    this.ordersCreatedTotal = new Counter({
      name: 'fshop_backend_orders_created_total',
      help: 'Total orders created through the backend',
      labelNames: ['source'],
      registers: [this.registry],
    });

    this.paymentsInitiatedTotal = new Counter({
      name: 'fshop_backend_payments_initiated_total',
      help: 'Total payment initiation attempts',
      labelNames: ['method'],
      registers: [this.registry],
    });

    this.moderationDecisionsTotal = new Counter({
      name: 'fshop_backend_moderation_decisions_total',
      help: 'Total moderation decisions produced or applied',
      labelNames: ['content_type', 'decision', 'priority'],
      registers: [this.registry],
    });
  }

  get contentType(): string {
    return this.registry.contentType;
  }

  async metrics(): Promise<string> {
    return this.registry.metrics();
  }

  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationMs: number,
  ): void {
    const labels = {
      method,
      route,
      status_code: String(statusCode),
    };

    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, durationMs / 1000);
  }

  recordOrderCreated(source = 'standard'): void {
    this.ordersCreatedTotal.inc({ source });
  }

  recordPaymentInitiated(method = 'unknown'): void {
    this.paymentsInitiatedTotal.inc({ method });
  }

  recordModerationDecision(
    contentType: string,
    decision: string,
    priority = 'NORMAL',
  ): void {
    this.moderationDecisionsTotal.inc({
      content_type: contentType,
      decision,
      priority,
    });
  }
}
