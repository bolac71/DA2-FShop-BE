/**
 * Centralized entity exports for TypeORM
 * This file serves as the single source of truth for all entities
 */

export { User } from '../modules/users/entities/user.entity';
export { Address } from '../modules/addresses/entities/address.entity';
export { Wishlist } from '../modules/wishlists/entities/wishlist.entity';
export { Cart } from '../modules/carts/entities/cart.entity';
export { CartItem } from '../modules/carts/entities/cart-item.entity';
export { Brand } from '../modules/brands/entities/brand.entity';
export { Category } from '../modules/categories/entities/category.entity';
export { Color } from '../modules/colors/entities/color.entity';
export { SizeType } from '../modules/size-types/entities/size-type.entity';
export { Size } from '../modules/sizes/entities/size.entity';
export { Product } from '../modules/products/entities/product.entity';
export { ProductImage } from '../modules/products/entities/product-image.entity';
export { ProductVariant } from '../modules/products/entities/product-variant.entity';
export { Inventory, InventoryTransaction } from '../modules/inventories/entities';
export { Order, OrderItem } from '../modules/orders/entities';
export { Coupon, CouponRedemption } from '../modules/coupons/entities';
export { Review, ReviewImage, ReviewVote } from '../modules/reviews/entities';
export { Post, PostComment, PostImage, PostLike, Hashtag, PostHashtag } from '../modules/posts/entities';
export { Notification } from '../modules/notifications/entities/notification.entity';
export { Conversation } from '../modules/chats/entities/conversation.entity';
export { Message } from '../modules/chats/entities/message.entity';