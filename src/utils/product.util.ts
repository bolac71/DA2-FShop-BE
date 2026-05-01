import { Product } from '../modules/products/entities/product.entity';
import { Coupon } from '../modules/coupons/entities';
import { CouponStatus, CouponType } from '../constants';

/**
 * Calculates the discount amount for a given coupon and product price.
 */
export const getCouponDiscountAmount = (coupon: Coupon, productPrice: number): number => {
  const couponValue = Number(coupon.value) || 0;
  const maxDiscountAmount = Number(coupon.maxDiscountAmount) || 0;

  if (coupon.type === CouponType.FIXED) {
    return Math.min(couponValue, productPrice);
  }

  if (coupon.type === CouponType.PERCENT) {
    const rawDiscount = (productPrice * couponValue) / 100;
    const cappedDiscount =
      maxDiscountAmount > 0 ? Math.min(rawDiscount, maxDiscountAmount) : rawDiscount;
    return Math.min(cappedDiscount, productPrice);
  }

  return 0;
};

/**
 * Finds the best available public coupon for a specific product and calculates the discount.
 */
export const getBestCouponForProduct = (product: Product, coupons: Coupon[]) => {
  const now = new Date();
  const productPrice = Number(product.price) || 0;

  let bestCoupon: Coupon | null = null;
  let maxDiscount = 0;

  for (const coupon of coupons) {
    if (!coupon.isPublic || !coupon.isActive || coupon.status !== CouponStatus.ACTIVE) {
      continue;
    }

    if (coupon.startDate > now || coupon.endDate < now) {
      continue;
    }

    if (coupon.applicableProduct && coupon.applicableProduct !== product.id) {
      continue;
    }

    if ((Number(coupon.minOrderAmount) || 0) > productPrice) {
      continue;
    }

    if ((coupon.maxUses || 0) > 0 && (coupon.usedCount || 0) >= (coupon.maxUses || 0)) {
      continue;
    }

    const discount = getCouponDiscountAmount(coupon, productPrice);

    if (discount > maxDiscount) {
      maxDiscount = discount;
      bestCoupon = coupon;
    }
  }

  return {
    maxCouponDiscount: Number(maxDiscount.toFixed(2)),
    bestCouponCode: bestCoupon?.code ?? null,
  };
};
