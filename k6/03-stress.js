import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const latencyTrend = new Trend('latency_ms');

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // ramp lên 50 users
    { duration: '2m', target: 50 },   // giữ 50 users
    { duration: '1m', target: 100 },  // ramp lên 100 users
    { duration: '2m', target: 100 },  // giữ 100 users
    { duration: '1m', target: 150 },  // ramp lên 150 users
    { duration: '2m', target: 150 },  // giữ 150 users — tìm breaking point
    { duration: '1m', target: 0 },    // ramp down
  ],
  thresholds: {
    // stress test: chấp nhận error cao hơn, mục đích là tìm giới hạn
    http_req_failed: ['rate<0.15'],
    http_req_duration: ['p(95)<3000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export default function () {
  const start = Date.now();

  const res = http.get(`${BASE_URL}/api/v1/products?page=1&limit=12`);

  latencyTrend.add(Date.now() - start);
  errorRate.add(res.status !== 200);

  check(res, {
    'status 200': (r) => r.status === 200,
    'response < 3s': (r) => r.timings.duration < 3000,
  });

  sleep(0.5);
}
