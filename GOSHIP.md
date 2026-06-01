Mặc dù môi trường Goship Sandbox (Dev) có hạn chế về việc không tự động bắn Webhook từ hãng vận chuyển thật, bạn vẫn có thể tích hợp và kiểm thử được tới 95% các tính năng vận chuyển của một website thương mại điện tử chuyên nghiệp.

Dưới đây là các chức năng bạn có thể tích hợp và cách vận hành chúng trên môi trường Dev hiện tại:

1. Tính phí ship động tại trang Thanh toán (Checkout)
Mô tả: Khi khách hàng nhập địa chỉ nhận hàng (Tỉnh/Thành, Quận/Huyện, Phường/Xã), hệ thống sẽ gửi địa chỉ đó qua API /rates của Goship Sandbox.
Kết quả: API sẽ trả về danh sách các đơn vị vận chuyển hỗ trợ tuyến đường đó (GHTK, GHN, Viettel Post...) kèm phí ship và thời gian dự kiến giao hàng thật.
Tích hợp: Khách hàng có thể so sánh giá và chọn ĐVVC họ muốn trực tiếp trên giao diện Checkout của website.
2. Tạo vận đơn tự động sang Goship
Mô tả: Khi Admin duyệt đơn hàng chuyển sang trạng thái Confirm (Xác nhận), backend sẽ tự động gọi API POST /shipments sang Goship.
Kết quả: Đơn nháp được tạo thành công trên trang quản trị dev-shop.goship.io (giống như ảnh bạn đã chụp). Website của bạn lưu lại được mã shipmentId (mã tham chiếu Goship) vào database.
3. Xem lịch trình vận chuyển (Tracking) trên Web/App
Mô tả: Khách hàng hoặc Admin có thể bấm nút "Xem hành trình" trên website để theo dõi đơn hàng đang đi đến đâu.
Tích hợp: Backend gọi API GET /shipments/search?code=<mã_goship> sang Goship Sandbox để lấy lịch sử dịch chuyển (ví dụ: Đã tiếp nhận, Đang vận chuyển, Đang giao...) và hiển thị thành timeline đẹp mắt trên giao diện.
4. Hủy vận đơn tự động khi hủy đơn hàng
Mô tả: Nếu khách hàng hủy đơn hàng (hoặc Admin hủy đơn) trước khi giao, hệ thống sẽ tự động gọi API DELETE /shipments/<mã_goship> sang Goship.
Kết quả: Vận đơn trên hệ thống Goship Sandbox sẽ tự động chuyển sang trạng thái Đã hủy (Canceled). Bạn có thể test toàn bộ luồng hủy đơn này.
5. Quản lý đối soát tiền thu hộ (COD) và hóa đơn cho Admin
Mô tả: Admin của bạn có thể xem danh sách các đợt chuyển tiền COD và các hóa đơn phí dịch vụ thông qua API /invoices và /transactions của Goship để làm báo cáo tài chính nội bộ.
6. Đồng bộ trạng thái đơn hàng tự động (Sử dụng Webhook giả lập)
Mô tả: Mặc dù Goship Sandbox không tự động bắn webhook, nhưng bạn đã xây dựng hoàn thiện endpoint nhận webhook tại backend (/api/v1/shipments/webhooks/goship).
Tích hợp: Bạn sử dụng Postman tự gửi payload webhook (giả lập shipper đi lấy hàng, giao thành công...) để kiểm tra xem hệ thống có tự động:
Cập nhật trạng thái đơn hàng (Ví dụ: tự đổi từ Xác nhận sang Đang giao).
Gửi thông báo (Notification) "Đơn hàng của bạn đang được giao" cho khách hàng hay không.