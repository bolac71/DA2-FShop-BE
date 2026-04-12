export enum PaymentStatus {
  PENDING = 'pending',           // Chờ xử lý thanh toán
  COMPLETED = 'completed',       // Thanh toán thành công
  FAILED = 'failed',             // Thanh toán thất bại
  EXPIRED = 'expired',           // Hết hạn thanh toán
  REFUNDED = 'refunded',         // Đã hoàn tiền
}
