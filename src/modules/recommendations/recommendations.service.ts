import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { InventoryType } from 'src/constants/inventory-type.enum';
import { InventoryTransaction } from '../inventories/entities/inventory-transaction.entity';
import { CouponsService } from '../coupons/coupons.service';
import { getBestCouponForProduct } from 'src/utils/product.util';

@Injectable()
export class RecommendationsService {
  constructor(
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    @InjectRepository(InventoryTransaction)
    private readonly inventoryTransactionRepository: Repository<InventoryTransaction>,
    private readonly couponsService: CouponsService,
  ) { }

  /**
   * Get products frequently bought together with the given product
   */
  async getFrequentlyBoughtTogether(productId: number, limit: number = 4) {
    // 1. Find all variant IDs for the target product
    const targetVariants = await this.variantRepository.find({
      where: { productId },
      select: ['id'],
    });
    const targetVariantIds = targetVariants.map(v => v.id);

    if (targetVariantIds.length === 0) {
      return {
        pagination: { total: 0, page: 1, limit },
        data: [],
      };
    }

    // 2. Find product IDs that appear in the same orders
    const rawResults = await this.orderItemRepository.query(`
      SELECT pv.product_id, COUNT(oi2.order_id) as co_occurrence_count
      FROM order_items oi1
      JOIN order_items oi2 ON oi1.order_id = oi2.order_id
      JOIN product_variants pv ON oi2.variant_id = pv.id
      WHERE oi1.variant_id = ANY($1)
        AND pv.product_id != $2
      GROUP BY pv.product_id
      ORDER BY co_occurrence_count DESC
      LIMIT $3
    `, [targetVariantIds, productId, limit]);

    const productIds = rawResults.map(r => r.product_id);

    if (productIds.length === 0) {
      return {
        pagination: { total: 0, page: 1, limit },
        data: [],
      };
    }

    // 3. Fetch full product details (same logic as ProductsService.findAll)
    const products = await this.productRepository.find({
      where: { id: In(productIds), isActive: true },
      relations: ['brand', 'category', 'images', 'variants'],
    });

    // 4. Process products (Stats, Coupons, etc.)
    const processedData = await this.processProducts(products);

    return {
      pagination: {
        total: productIds.length,
        page: 1,
        limit,
      },
      data: processedData,
    };
  }

  /**
   * Reuses logic from ProductsService to ensure standardized response
   */
  private async processProducts(data: Product[]) {
    const publicCoupons = await this.couponsService.getPublicActiveCoupons();
    const productIds = data.map((p) => p.id);

    const soldQuantitiesByProduct: Record<number, number> = {};
    if (productIds.length > 0) {
      const variants = data.flatMap((p) =>
        p.variants?.filter((v) => v.isActive).map((v) => ({ id: v.id, productId: p.id })) ?? [],
      );

      if (variants.length > 0) {
        const variantIds = variants.map((v) => v.id);
        const soldData: Array<{ product_id: number; sold_quantity: string }> = await this.inventoryTransactionRepository.query(
          `SELECT pv.product_id, COALESCE(SUM(it.quantity), 0) as sold_quantity
           FROM inventory_transactions it
           JOIN product_variants pv ON it.variant_id = pv.id
           WHERE it.type = $1 AND pv.id = ANY($2)
           GROUP BY pv.product_id`,
          [InventoryType.EXPORT, variantIds],
        );

        soldData.forEach((row) => {
          soldQuantitiesByProduct[row.product_id] = Number(row.sold_quantity) || 0;
        });
      }
    }

    return data.map((product) => ({
      ...getBestCouponForProduct(product, publicCoupons),
      ...product,
      images: product.images?.filter((img) => img.isActive) ?? [],
      variants: product.variants?.filter((v) => v.isActive) ?? [],
      averageRating: product.averageRating || 0,
      soldQuantity: soldQuantitiesByProduct[product.id] || 0,
    }));
  }
}

