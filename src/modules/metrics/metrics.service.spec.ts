import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  it('exports Prometheus metrics without duplicate registration', async () => {
    const first = new MetricsService();
    const second = new MetricsService();

    first.recordHttpRequest('GET', '/api/v1/health', 200, 25);
    second.recordPaymentInitiated('momo');

    await expect(first.metrics()).resolves.toContain(
      'fshop_backend_http_requests_total',
    );
    await expect(second.metrics()).resolves.toContain(
      'fshop_backend_payments_initiated_total',
    );
  });
});
