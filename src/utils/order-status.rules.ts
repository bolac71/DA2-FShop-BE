/* eslint-disable @typescript-eslint/only-throw-error */
import { OrderStatus } from 'src/constants/order-status.enum';

export type ActorRole = 'user' | 'admin';

/* Các trạng thái cuối, không thể chuyển tiếp */
export const FINAL_STATUSES = new Set<OrderStatus>([
  OrderStatus.REFUNDED,
]);

/* Quy tắc chuyển trạng thái hợp lệ theo nghiệp vụ. */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURN_REQUESTED],
  [OrderStatus.RETURN_REQUESTED]: [OrderStatus.RETURNED],
  [OrderStatus.RETURNED]: [OrderStatus.REFUNDED],
  [OrderStatus.CANCELED]: [],           
  [OrderStatus.REFUNDED]: [],           
};

/*
 * Quyền của USER (khách hàng) chỉ được:
  - hủy khi đơn còn sớm
  - yêu cầu đổi/trả sau khi đã nhận hàng
 */
export const USER_ALLOWED_TARGETS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  [OrderStatus.PENDING]: [OrderStatus.CANCELED],
  [OrderStatus.CONFIRMED]: [OrderStatus.CANCELED],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURN_REQUESTED],
};

/* ADMIN được phép toàn bộ theo ALLOWED_TRANSITIONS */
export const ADMIN_ALLOWED_TARGETS = ALLOWED_TRANSITIONS;

export function nextStatuses(current: OrderStatus): OrderStatus[] {
  return ALLOWED_TRANSITIONS[current] ?? [];
}

/**
 * Kiểm tra quyền + quy tắc chuyển trạng thái.
 * Ném lỗi dạng string để service quyết định trả HttpException phù hợp.
 */
export function ensureTransitionAllowed(
  current: OrderStatus,
  next: OrderStatus,
  actorRole: ActorRole
) {
  if (current === next) return; 

  // chặn trạng thái cuối
  if (FINAL_STATUSES.has(current)) {
    throw `Order already in final state (${current}), cannot transition`;
  }

  // kiểm tra nghiệp vụ chung
  const allowedByFlow = ALLOWED_TRANSITIONS[current] ?? [];
  if (!allowedByFlow.includes(next)) {
    throw `Invalid status transition: ${current} -> ${next}`;
  }

  // kiểm tra theo quyền
  if (actorRole === 'admin') return;

  // user
  const userAllowed = USER_ALLOWED_TARGETS[current] ?? [];
  if (!userAllowed.includes(next)) {
    throw `Forbidden for user: cannot change ${current} -> ${next}`;
  }
}
