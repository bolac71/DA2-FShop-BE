import { OrderStatus } from 'src/constants/order-status.enum';
import { ensureTransitionAllowed, nextStatuses } from './order-status.rules';

describe('order-status rules', () => {
  it('allows an admin to move pending orders to confirmed', () => {
    expect(() =>
      ensureTransitionAllowed(
        OrderStatus.PENDING,
        OrderStatus.CONFIRMED,
        'admin',
      ),
    ).not.toThrow();
  });

  it('allows users to cancel early orders', () => {
    expect(() =>
      ensureTransitionAllowed(
        OrderStatus.CONFIRMED,
        OrderStatus.CANCELED,
        'user',
      ),
    ).not.toThrow();
  });

  it('blocks users from forcing fulfillment transitions', () => {
    expect(() =>
      ensureTransitionAllowed(
        OrderStatus.CONFIRMED,
        OrderStatus.AWAITING_PICKUP,
        'user',
      ),
    ).toThrow('Forbidden for user');
  });

  it('blocks transitions from final states', () => {
    expect(() =>
      ensureTransitionAllowed(
        OrderStatus.DELIVERED,
        OrderStatus.CANCELED,
        'admin',
      ),
    ).toThrow('Order already in final state');
  });

  it('lists the next statuses for the current order state', () => {
    expect(nextStatuses(OrderStatus.OUT_FOR_DELIVERY)).toEqual([
      OrderStatus.DELIVERED,
      OrderStatus.DELIVERY_FAILED,
    ]);
  });
});
