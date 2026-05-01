import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { InventoryType } from '../../constants/inventory-type.enum';
import { InventoryTransaction } from '../inventories/entities/inventory-transaction.entity';
import { CouponsService } from '../coupons/coupons.service';
import { getBestCouponForProduct } from '../../utils/product.util';
import { UserInteractionsService } from '../user-interactions/user-interactions.service';


@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);
  private readonly aiServerUrl: string;
  private readonly aiRequestTimeoutMs: number;
  private readonly PRODUCT_IMAGE_ID_OFFSET = 1_000_000_000;

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
    private readonly interactionsService: UserInteractionsService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.aiServerUrl =
      this.configService.get<string>('AI_SERVICE_URL') ||
      this.configService.get<string>('AI_SERVER_URL') ||
      'http://localhost:8000';

    const configuredTimeout = Number(
      this.configService.get<string>('AI_RECOMMENDATION_TIMEOUT_MS') || '30000',
    );
    this.aiRequestTimeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0
      ? configuredTimeout
      : 30000;
  }

  /**
   * Get personalized recommendations for a user based on their behavior (Hybrid AI)
   */
  async getPersonalizedRecommendations(userId: number, limit: number = 10) {
    const loggerContext = `getPersonalizedRecommendations(userId=${userId}, limit=${limit})`;
    try {
      // 1. Get recent interactions (30 days)
      const interactions = await this.interactionsService.getRecentInteractions(userId, 30);
      
      if (interactions.length === 0) {
        // Fallback to trending or frequently bought together if no history
        return this.getTrendingProducts(limit);
      }

      // 2. Prepare payload for AI Server
      const aiInteractions = interactions.map(it => {
        const primaryImage = it.product?.images?.find(img => img.isActive) || it.product?.images?.[0];
        const daysAgo = (Date.now() - new Date(it.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        
        return {
          image_id: primaryImage ? this.PRODUCT_IMAGE_ID_OFFSET + primaryImage.id : null,
          days_ago: daysAgo,
          score: it.score,
          brand_id: it.product?.brandId,
          category_id: it.product?.categoryId,
          // Color/Size from recent purchase if available, else null
          color_id: null, 
          size_id: null,
        };
      }).filter(it => it.image_id !== null);

      if (aiInteractions.length === 0) {
        return this.getTrendingProducts(limit);
      }

      // 3. Call AI Server
      let recommendedProductIds: number[] | null = null;
      try {
        console.log({
          interactions: aiInteractions,
          limit,
        });
        const response = await firstValueFrom(
          this.httpService.post(
            `${this.aiServerUrl}/recommend/profile-based`,
            {
              interactions: aiInteractions,
              limit,
            },
            {
              timeout: this.aiRequestTimeoutMs,
            },
          ),
        );

        recommendedProductIds = response.data.product_ids;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`AI recommendations unavailable, falling back to trending products: ${message}`);
        return this.getTrendingProducts(limit);
      }

      if (!recommendedProductIds || recommendedProductIds.length === 0) {
        return this.getTrendingProducts(limit);
      }

      // 4. Fetch full product details
      const products = await this.productRepository.find({
        where: { id: In(recommendedProductIds), isActive: true },
        relations: ['brand', 'category', 'images', 'variants'],
      });

      // Maintain AI order
      let orderedProducts = recommendedProductIds
        .map(id => products.find(p => p.id === id))
        .filter(p => !!p);

      // 5. If we don't have enough products, fill with trending to reach the limit
      if (orderedProducts.length < limit) {
        const missingCount = limit - orderedProducts.length;
        const existingProductIds = new Set(orderedProducts.map(p => p.id));
        
        this.logger.log(`AI returned ${orderedProducts.length} products, fetching ${missingCount} trending products to reach limit of ${limit}`);
        
        const trendingResult = await this.getTrendingProducts(missingCount * 2);
        const trendingProducts = trendingResult.data as Product[];
        
        for (const product of trendingProducts) {
          if (!existingProductIds.has(product.id) && orderedProducts.length < limit) {
            orderedProducts.push(product);
            existingProductIds.add(product.id);
          }
        }
      }

      const processedData = await this.processProducts(orderedProducts.slice(0, limit));

      return {
        pagination: {
          total: processedData.length,
          page: 1,
          limit,
        },
        data: processedData,
      };

    } catch (error) {
      this.logger.error('Failed to get personalized recommendations', error instanceof Error ? error.stack : String(error));
      return this.getTrendingProducts(limit);
    }
  }

  /**
   * Fallback logic: Trending products based on sold quantity
   */
  async getTrendingProducts(limit: number = 10) {
    const rawResults = await this.inventoryTransactionRepository.query(`
      SELECT pv.product_id, SUM(it.quantity) as total_sold
      FROM inventory_transactions it
      JOIN product_variants pv ON it.variant_id = pv.id
      WHERE it.type = $1
      GROUP BY pv.product_id
      ORDER BY total_sold DESC
      LIMIT $2
    `, [InventoryType.EXPORT, limit]);

    const productIds = rawResults.map(r => r.product_id);
    
    if (productIds.length === 0) {
      // Last fallback: newest products
      const newestProducts = await this.productRepository.find({
        where: { isActive: true },
        order: { createdAt: 'DESC' },
        take: limit,
        relations: ['brand', 'category', 'images', 'variants'],
      });
      return {
        pagination: { total: newestProducts.length, page: 1, limit },
        data: await this.processProducts(newestProducts),
      };
    }

    const products = await this.productRepository.find({
      where: { id: In(productIds), isActive: true },
      relations: ['brand', 'category', 'images', 'variants'],
    });

    // Maintain order
    const orderedProducts = productIds
        .map(id => products.find(p => p.id === id))
        .filter(p => !!p);

    return {
      pagination: { total: orderedProducts.length, page: 1, limit },
      data: await this.processProducts(orderedProducts),
    };
  }

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

    // 3. Fetch full product details
    const products = await this.productRepository.find({
      where: { id: In(productIds), isActive: true },
      relations: ['brand', 'category', 'images', 'variants'],
    });

    // 4. Process products
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
