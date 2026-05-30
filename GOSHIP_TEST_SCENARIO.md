# Kịch bản Kiểm thử Tích hợp Vận chuyển GOSHIP

Tài liệu này hướng dẫn cách kiểm thử luồng tự động tạo vận đơn (Chức năng 2) và tự động cập nhật mã vận đơn qua webhook giả lập trên môi trường phát triển (Dev/Sandbox).

---

## KỊCH BẢN 1: Tạo Vận Đơn Tự Động Sang GOSHIP khi Xác Nhận Đơn Hàng

### Bước 1: Chuẩn bị dữ liệu đầu vào
1. Đảm bảo trong database của bạn có ít nhất một đơn hàng ở trạng thái `pending` (chờ thanh toán/chờ duyệt).
   * Ghi lại **ID đơn hàng** này (ví dụ: `15`).
2. Đăng nhập tài khoản Admin của bạn trên website/Postman để lấy mã **JWT Access Token** phục vụ cho việc gửi request duyệt đơn.

### Bước 2: Gửi request cập nhật trạng thái đơn hàng sang `confirmed` (Xác nhận)
Sử dụng **Postman** hoặc công cụ **cURL** gửi request sau:

* **Method**: `PATCH`
* **URL**: `http://localhost:<port_backend_của_bạn>/api/v1/orders/15/status`
* **Headers**:
  * `Authorization: Bearer <JWT_ACCESS_TOKEN_CỦA_ADMIN>`
  * `Content-Type: application/json`
* **Body (JSON)**:
  ```json
  {
    "status": "confirmed",
    "reason": "Duyệt đơn hàng và đẩy sang hãng vận chuyển."
  }
  ```

### Bước 3: Kiểm tra Console Log của Backend
Nếu cấu hình thành công, console log của server NestJS sẽ hiển thị các dòng log tương tự:
1. `Updating order status: orderId=15, nextStatus=confirmed...`
2. `Attempting to auto-create shipment via GOSHIP for order 15`
3. `Creating GOSHIP shipment with data: ...` (Thông tin người gửi, người nhận và gói hàng gửi đi).

### Bước 4: Kiểm tra kết quả trong Database và Dashboard Goship
* **Tại Database**:
  * Kiểm tra bảng `shipments` xem có dòng dữ liệu mới được tạo tự động cho đơn hàng `#15` hay không.
  * Cột `shipment_id` phải lưu được mã vận đơn của Goship (Ví dụ: `GSL9V2APK6`).
  * Cột `tracking_code` tại thời điểm này sẽ là `null` vì GHTK chưa cấp mã vận đơn thật do tài khoản Sandbox mặc định chưa bắn đi.
* **Tại Dashboard Goship Sandbox**:
  * Đăng nhập vào [https://dev-shop.goship.io](https://dev-shop.goship.io).
  * Vào mục **Quản lý vận đơn**, kiểm tra xem có đơn hàng nháp mới được tạo khớp với thông tin địa chỉ nhận, số điện thoại, giá tiền của đơn hàng `#15` hay không.

---

## KỊCH BẢN 2: Giả Lập Webhook từ Goship Trả Về Mã Vận Đơn (Tracking Code)

Vì môi trường Sandbox của Goship không tự động bắn webhook về máy local của bạn, bạn cần giả lập request webhook để kiểm tra xem website có tự động lưu mã vận đơn và đổi trạng thái đơn hàng sang **Chờ lấy hàng** hay không.

### Bước 1: Lấy `shipment_id` vừa tạo ở Kịch bản 1
* Xem cột `shipment_id` của đơn hàng trong bảng `shipments` (Ví dụ: `GSL9V2APK6`).

### Bước 2: Gửi request giả lập Webhook từ Goship về website
Sử dụng **Postman** hoặc **cURL** gửi request sau:

* **Method**: `POST`
* **URL**: `http://localhost:<port_backend_của_bạn>/api/v1/shipments/webhooks/goship`
* **Headers**:
  * `Content-Type: application/json`
* **Body (JSON)**:
  ```json
  {
    "gcode": "GSL9V2APK6", 
    "code": "GHTK_TEST_123456789", 
    "status": "901",
    "status_text": "Chờ lấy hàng",
    "message": "Chờ shipper qua lấy hàng",
    "tracking_url": "https://donhang.ghn.vn/?order_code=GHTK_TEST_123456789",
    "description": "Shipper đang trên đường đến lấy hàng"
  }
  ```

### Bước 3: Xác nhận kết quả tự động cập nhật trên hệ thống
* **Tại Database**:
  * Cột `tracking_code` trong bảng `shipments` đã tự động cập nhật từ `null` thành **`GHTK_TEST_123456789`**.
  * Cột `tracking_url` lưu đúng link tra cứu.
  * Trạng thái đơn hàng trong bảng `orders` của bạn đã tự động chuyển sang **`awaiting_pickup`** (Chờ lấy hàng).
* **Tại Giao diện Khách hàng**:
  * Khách hàng vào trang chi tiết đơn hàng sẽ thấy thông tin mã vận đơn mới `GHTK_TEST_123456789` kèm theo trạng thái đơn hàng cập nhật và link tra cứu hành trình.
