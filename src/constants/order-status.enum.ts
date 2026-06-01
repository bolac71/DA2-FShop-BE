export enum OrderStatus {
  PENDING = 'pending', // KH vừa đặt
  CONFIRMED = 'confirmed', // Kho xác nhận
  AWAITING_PICKUP = 'awaiting_pickup', // Chờ hãng qua lấy hàng
  IN_TRANSIT = 'in_transit', // Đang vận chuyển
  OUT_FOR_DELIVERY = 'out_for_delivery', // Đang giao trong ngày
  DELIVERED = 'delivered', // Đã giao thành công
  DELIVERY_FAILED = 'delivery_failed', // Giao thất bại
  CANCELED = 'canceled', // Đã hủy
}
