import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 2,
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export default function () {
  let res = http.get(`${BASE_URL}/api/v1/health`);
  check(res, { 'health: status 200': (r) => r.status === 200 });

  res = http.get(`${BASE_URL}/api/v1/products?page=1&limit=12`);
  check(res, { 'products: status 200': (r) => r.status === 200 });

  res = http.get(`${BASE_URL}/api/v1/products?search=áo&page=1&limit=12`);
  check(res, { 'search: status 200': (r) => r.status === 200 });

  sleep(1);
}
