Các tính năng GOSHIP có thể tích hợp hợp lý nhất trong dự án này là:

- Tạo vận đơn tự động khi đơn được xác nhận hoặc chuyển sang xử lý, rồi lưu mã vận đơn, mã tracking và thông tin hãng giao hàng.
- Báo giá ship động theo địa chỉ thật của khách, thay cho mức phí cố định standard/express hiện tại.
- Chọn dịch vụ giao hàng theo nhiều gói của GOSHIP, ví dụ nhanh, tiết kiệm, COD, bảo hiểm, nếu API của GOSHIP hỗ trợ.
- Đồng bộ trạng thái vận đơn về đơn hàng nội bộ, ví dụ chờ lấy hàng, đang giao, giao thành công, giao thất bại, hoàn hàng.
- Hủy vận đơn khi đơn bị hủy hoặc khi shop không thể xử lý tiếp.
- Tra cứu hành trình đơn hàng cho khách và admin, để xem thời gian lấy hàng, điểm trung chuyển, ETA và trạng thái hiện tại.
- Thu hộ COD và đối soát tiền nếu GOSHIP cung cấp chức năng này.
- Kiểm tra tính hợp lệ của địa chỉ và thông tin lấy hàng trước khi tạo vận đơn, tận dụng các trường province, district, commune và recipientPhone đang có trong dữ liệu địa chỉ trong address.entity.ts:15, address.entity.ts:21, address.entity.ts:24, address.entity.ts:27.
- Gửi thông báo cho khách khi trạng thái vận đơn thay đổi, tận dụng luôn pattern notification/webhook mà hệ thống đang dùng cho payment.
