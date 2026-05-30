# Tóm tắt tích hợp GOSHIP vào DA2-FShop-BE

Mục đích: Tài liệu ngắn gọn, dễ đọc cho người và AI, mô tả cách dự án đã tích hợp GOSHIP, các chức năng hiện có, các file liên quan và gợi ý bảo trì.

## Tổng quan
- Nhà tích hợp: GOSHIP (dịch vụ vận chuyển).
- Vị trí mã: logic tích hợp nằm trong `src/integrations/goship/goship.client.ts`.
- Mô-đun sử dụng: `src/modules/shipments/*` (xử lý tạo, đồng bộ trạng thái, webhook, hủy, tra cứu).

## Chức năng đã tích hợp
- Tạo vận đơn: `GoshipClient.createShipment()` gửi `POST /shipments` tới GOSHIP.
- Lấy báo giá (rates): `GoshipClient.getRates()` (POST `/rates`).
- Tra cứu tracking: `GoshipClient.getTracking()` (GET `/shipments/search?code=...`).
- Hủy vận đơn: `GoshipClient.cancelShipment()` (DELETE `/shipments/:id`).
- Đối soát COD / hóa đơn: `listInvoices()` và `listTransactions()`.
- Xác thực webhook: `GoshipClient.verifyWebhookSignature(payload, signature)` dùng `HMAC SHA256` với `GoshipConfig.webhookSecret`.
- Xử lý webhook bên trong: `ShipmentsService.handleWebhookUpdate(payload)` — cập nhật `Shipment` local, map sang `Order` status, gửi notification (sử dụng `NotificationsService`).

## File chính (quick links)
- [src/integrations/goship/goship.client.ts](src/integrations/goship/goship.client.ts#L1)
- [src/modules/shipments/shipments.service.ts](src/modules/shipments/shipments.service.ts#L1)
- [src/modules/shipments/shipments.controller.ts](src/modules/shipments/shipments.controller.ts#L1)
- [src/modules/shipments/entities/shipment.entity.ts](src/modules/shipments/entities/shipment.entity.ts#L1)
- [src/configs/goship.config.ts](src/configs/goship.config.ts#L1) (cấu hình API key, baseUrl, webhookSecret, default shipper)

## Cách hoạt động của webhook (hiện tại)
1. Controller `POST /shipments/webhooks/goship` nhận payload và header `x-goship-hmac-sha256`.
2. Gọi `GoshipClient.verifyWebhookSignature(payload, signature)` để check tính xác thực.
3. Nếu hợp lệ, forward payload sang `ShipmentsService.handleWebhookUpdate(payload)`.
4. Service sẽ:
   - Lấy mã vận đơn từ payload (hiện code kiểm tra `gcode`), lookup `Shipment` theo `shipmentId`.
   - Cập nhật `shipment.shipmentStatus`, `shipment.shipmentStatusCode`, `trackingCode`, `trackingUrl`, `shipmentMeta` (ghi cả payload webhook).
   - Map mã trạng thái GOSHIP thành `OrderStatus` nội bộ (hàm `mapGoshipStatusToOrderStatus`).
   - Nếu status map sang trạng thái mới, update `Order` và tạo notification.
   - Nếu không tìm thấy `Shipment`, trả về ack `{ updated: false, reason: 'shipment_not_found' }` (không throw lỗi nặng để tránh retry vô hạn).

## Ghi chú về schema mismatch (vấn đề đã thấy)
- Hiện `GoshipWebhookPayload` trong mã nguồn định nghĩa `gcode` và `status`.
- Thực tế payload log nhận được từ Goship (ví dụ của bạn) dùng `shipment_code` và `shipment_status`.
- Do vậy handler hiện tại throw `Missing gcode in webhook payload` khi provider gửi `shipment_code`.

Gợi ý khắc phục (đã áp dụng ý tưởng):
- Chuẩn hóa mã vận đơn ngay tại handler: dùng `const providerShipmentId = payload.shipment_code || payload.gcode || payload.code`.
- Hỗ trợ cả `status` và `shipment_status` khi lấy mã trạng thái: `const statusValue = payload.status ?? payload.shipment_status`.
- Không thay đổi bước verify chữ ký (phải check trên body nguyên gốc trước normalize).

## Ví dụ payloads (thực tế vs hiện tại)
- Thực tế (theo log bạn gửi):
```json
{
  "error": null,
  "order_id": null,
  "shipment_code": "GSL9V2APK6",
  "shipment_status": 900,
  "carrier_error": null,
  "update_time": 1780124687
}
```

- Hiện tại code kỳ vọng (kiểu `GoshipWebhookPayload`):
```json
{
  "gcode": "GSL9V2APK6",
  "status": "900",
  "status_text": "...",
  "code": "TRACK123",
  "tracking_url": "..."
}
```

## Các điểm kiểm tra khi bảo trì / mở rộng
- Đảm bảo `GoshipConfig.webhookSecret` được cấu hình trong môi trường để verify webhook.
- Khi thay đổi normalization, cập nhật `GoshipWebhookPayload` type (hoặc dùng `unknown` + runtime guards) và thêm unit test cho cả 2 dạng payload.
- Xem xét log đầy đủ của Goship (nếu có sandbox/docs) để bổ sung tất cả alias trường (ví dụ: `shipment_code`, `gcode`, `code`).

## Dành cho AI / dev mới: quick pointers
- Entry points: `handleGoshipWebhook` (controller) → `handleWebhookUpdate` (service).
- Key functions: `GoshipClient.verifyWebhookSignature`, `ShipmentsService.mapGoshipStatusToOrderStatus`.
- Tìm lỗi thường gặp: mismatch tên trường (`gcode` vs `shipment_code`), kiểu dữ liệu `status` là string vs number.
- Test suggestion: thêm 2 unit tests calling `ShipmentsService.handleWebhookUpdate()` with payloads that contain only `shipment_code` and only `gcode`.

## Next steps (đề xuất)
- (Ưu tiên) Thêm normalization và unit test cho webhook (nếu muốn, tôi có thể tạo PR nhỏ này).
- Thêm logging chi tiết cho webhook payloads đang được verify để dễ debug khi có payload khác biệt.

---
Tài liệu này do AI tạo để tóm tắt trạng thái hiện có. Nếu bạn muốn, tôi có thể mở PR chứa:
- sửa `GoshipWebhookPayload` type,
- sửa `ShipmentsService.handleWebhookUpdate` để chuẩn hóa các alias,
- thêm 2 unit tests cho webhook.
