import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 20 },
    { duration: '8m', target: 20 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    errors: ['rate<0.02'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export default function () {
  const rand = Math.random();
  let res;

  if (rand < 0.5) {
    // 50%: duyệt danh sách sản phẩm
    res = http.get(`${BASE_URL}/api/v1/products?page=1&limit=12`);
    errorRate.add(res.status !== 200);
    check(res, { 'browse products: 200': (r) => r.status === 200 });
  } else if (rand < 0.8) {
    // 30%: tìm kiếm sản phẩm
    const keywords = ['áo', 'quần', 'váy', 'giày', 'túi'];
    const kw = keywords[Math.floor(Math.random() * keywords.length)];
    res = http.get(`${BASE_URL}/api/v1/products?search=${encodeURIComponent(kw)}&page=1&limit=12`);
    errorRate.add(res.status !== 200);
    check(res, { 'search products: 200': (r) => r.status === 200 });
  } else {
    // 20%: health check (simulates monitoring)
    res = http.get(`${BASE_URL}/api/v1/health`);
    errorRate.add(res.status !== 200);
    check(res, { 'health: 200': (r) => r.status === 200 });
  }

  sleep(1);
}
