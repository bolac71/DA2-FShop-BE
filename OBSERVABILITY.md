# FShop Backend Observability & Test Guide

Guide này dùng để test nhanh logging, monitoring, DORA-lite metrics và test case backend khi demo đồ án.

## 1. Thành Phần Đã Có

- Backend metrics: `GET /api/v1/metrics`, trả Prometheus text format.
- Backend health: `GET /api/v1/health`, dùng để smoke test và deploy healthcheck.
- Structured logs: JSON logs với `requestId`, `method`, `path`, `statusCode`.
- Prometheus: scrape backend metrics và DORA-lite metrics.
- Grafana: dashboard `FShop Backend Observability`.
- Loki + Promtail: gom Docker container logs và xem trong Grafana Explore.
- DORA-lite exporter: đọc GitHub Actions workflow runs và expose metrics cho Prometheus.

## 2. Chạy Backend Local

Backend cần chạy ở port `4000` để Prometheus scrape đúng target mặc định.

```powershell
cd "C:\Users\Ngo Minh Tri\workspace\uit\DA2\fshop-be"
npm run start:dev
```

Kiểm tra backend:

```powershell
curl http://localhost:4000/api/v1/health
curl http://localhost:4000/api/v1/metrics
```

Kỳ vọng:

- `/health` trả `status: ok`.
- `/metrics` có các metric như `fshop_backend_http_requests_total`.

## 3. Chạy Observability Stack

```powershell
cd "C:\Users\Ngo Minh Tri\workspace\uit\DA2\fshop-be"
docker compose -f docker-compose.observability.yml up -d
```

Truy cập:

```text
Grafana:    http://localhost:3001
Prometheus: http://localhost:9090
Loki API:   http://localhost:3100/ready
DORA:       http://localhost:9101/metrics
```

Grafana login mặc định:

```text
Username: admin
Password: admin
```

Lưu ý:

- `localhost:3100` là Loki API, không phải UI.
- Xem log qua Grafana tại `http://localhost:3001`, mục Explore, chọn datasource `Loki`.

## 4. Cấu Hình DORA-lite

DORA-lite exporter cần biết repo GitHub để đọc workflow runs.

Cách khuyến nghị: thêm vào file `.env` ở thư mục backend:

```env
GITHUB_REPOSITORY=bolac71/DA2-FShop-BE
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxx
DORA_WORKFLOW_NAME=Backend CI/CD
DORA_WINDOW_DAYS=7
```

Nếu repo public, có thể thử bỏ `GITHUB_TOKEN`. Nếu repo private, token cần quyền đọc repo/actions.

Sau khi sửa `.env`, recreate service:

```powershell
docker compose -f docker-compose.observability.yml up -d --force-recreate dora-exporter prometheus grafana
```

Kiểm tra exporter:

```powershell
curl http://localhost:9101/metrics
```

Kỳ vọng có các metric:

```text
fshop_dora_deployment_frequency_daily
fshop_dora_change_failure_rate
fshop_dora_latest_lead_time_seconds
fshop_dora_latest_restore_seconds
```

Nếu các metric vẫn bằng `0`, thường là do:

- Workflow `Backend CI/CD` chưa từng chạy trên GitHub.
- `GITHUB_REPOSITORY` sai tên.
- Repo private nhưng token thiếu quyền.
- Container `dora-exporter` chưa được recreate sau khi sửa env.

## 5. Test Prometheus

Mở:

```text
http://localhost:9090/targets
```

Kỳ vọng:

- `fshop-backend`: `UP`
- `fshop-dora`: `UP`
- `prometheus`: `UP`

Query thử trong Prometheus:

```promql
fshop_backend_http_requests_total
```

```promql
histogram_quantile(0.95, sum(rate(fshop_backend_http_request_duration_seconds_bucket[5m])) by (le))
```

```promql
fshop_dora_deployment_frequency_daily
```

## 6. Test Grafana Dashboard

Mở:

```text
http://localhost:3001
```

Vào:

```text
Dashboards -> FShop -> FShop Backend Observability
```

Tạo traffic để dashboard có dữ liệu:

```powershell
curl http://localhost:4000/api/v1/health
curl http://localhost:4000/api/v1/metrics
curl http://localhost:4000/api/v1/not-found-demo
```

Kỳ vọng dashboard thấy:

- Request Rate tăng.
- Latency p95 có dữ liệu.
- Error Rate có thể tăng nhẹ sau request 404/500.
- Memory có dữ liệu.
- DORA widgets có dữ liệu nếu exporter đọc được GitHub Actions.

## 7. Test Loki Logs

Vào Grafana:

```text
Explore -> chọn datasource Loki
```

Query logs của các container observability:

```logql
{container=~"fshop_prometheus|fshop_grafana|fshop_loki|fshop_dora_exporter|fshop_promtail"}
```

Query rộng hơn:

```logql
{container=~".+"}
```

Nếu backend chạy bằng `npm run start:dev` trực tiếp trên máy, Promtail không bắt được log backend vì config hiện đọc Docker container logs. Khi backend chạy bằng Docker container, query backend:

```logql
{container=~".*fshop.*|.*backend.*"}
```

Check Loki API:

```text
http://localhost:3100/ready
```

Kỳ vọng trả:

```text
ready
```

## 8. Test Case Backend

Chạy toàn bộ unit test:

```powershell
npm test -- --runInBand
```

Chạy e2e smoke test:

```powershell
npm run test:e2e -- --runInBand
```

Chạy lint:

```powershell
npm run lint:check
```

Chạy build:

```powershell
npm run build
```

Chạy coverage:

```powershell
npm run test:cov -- --runInBand
```

Report coverage:

```text
coverage/lcov-report/index.html
```

## 9. Các Test Hiện Có

Unit test:

- `MoMoGateway`: thiếu config, tạo payload initiate payment, verify webhook signature.
- `ModerationService`: pending queue, rejected queue, override decision.
- `MinioService`: upload, download, list, delete, presigned URL.
- `MetricsService`: export Prometheus metrics, tránh duplicate registry.
- `StartTimingMiddleware`: attach `requestId`, record HTTP metrics.
- `order-status.rules`: kiểm tra rule chuyển trạng thái đơn hàng.

E2E smoke test:

- `GET /api/v1/health`
- `GET /api/v1/metrics`

Kỳ vọng khi pass:

```text
Test Suites: 6 passed, 6 total
Tests: 20 passed, 20 total
```

E2E:

```text
Test Suites: 1 passed, 1 total
Tests: 2 passed, 2 total
```

## 10. Kịch Bản Demo Cho Cô

1. Mở GitHub Actions:
   - Chỉ ra workflow CI/CD.
   - Giải thích lint, unit test, e2e smoke, build, Docker image, deploy skip nếu chưa có VPS.

2. Chạy backend local:
   - Mở `/api/v1/health`.
   - Mở `/api/v1/metrics`.

3. Mở Prometheus:
   - Vào `/targets`, chỉ ra backend và DORA exporter đang `UP`.
   - Query `fshop_backend_http_requests_total`.

4. Mở Grafana dashboard:
   - Gọi vài API.
   - Chỉ ra request rate, latency, memory, error rate.

5. Mở Grafana Explore với Loki:
   - Query log container.
   - Giải thích backend Docker logs có thể trace bằng `requestId`.

6. Demo DORA-lite:
   - Chỉ ra DORA widgets trên Grafana.
   - Giải thích 4 metric:
     - Deployment Frequency
     - Lead Time for Changes
     - Change Failure Rate
     - Time to Restore Service

7. Chạy test:
   - `npm test -- --runInBand`
   - `npm run test:e2e -- --runInBand`
   - Giải thích test đang tập trung critical modules, không phải full coverage toàn hệ thống.

## 11. Dừng Stack

```powershell
docker compose -f docker-compose.observability.yml down
```

Xóa volume nếu muốn reset sạch dữ liệu Grafana/Prometheus/Loki:

```powershell
docker compose -f docker-compose.observability.yml down -v
```
