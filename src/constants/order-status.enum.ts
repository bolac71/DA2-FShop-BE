export enum OrderStatus {
  PENDING = 'pending',                 // KH vừa đặt
  CONFIRMED = 'confirmed',             // Kho xác nhận
  PROCESSING = 'processing',           // Đang chuẩn bị/đóng gói
  SHIPPED = 'shipped',                 // Đang giao
  DELIVERED = 'delivered',             // Đã giao thành công
  CANCELED = 'canceled',               // Đã hủy
  RETURN_REQUESTED = 'return_requested', // KH yêu cầu đổi/trả
  RETURNED = 'returned',               // Kho đã nhận hàng trả
  REFUNDED = 'refunded',               // Đã hoàn tiền

}