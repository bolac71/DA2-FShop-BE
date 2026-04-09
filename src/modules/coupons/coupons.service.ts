import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Coupon, CouponRedemption } from './entities';
import { CreateCouponDto, UpdateCouponDto } from './dtos';
import { CouponStatus, CouponType, NotificationType } from 'src/constants';
import { QueryCouponDto } from './dtos/query-coupon.dto';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { GetBestPublicCouponDto } from './dtos/best-coupon';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);

  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
    @InjectRepository(CouponRedemption)
    private readonly couponRedemptionRepository: Repository<CouponRedemption>,
    @InjectRepository(ProductVariant)
    private readonly productVariantRepository: Repository<ProductVariant>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  private calculateDiscountAmount(coupon: Coupon, orderAmount: number): number {
    const value = Number(coupon.value) || 0;
    const maxDiscountAmount = Number(coupon.maxDiscountAmount) || 0;

    if (coupon.type === CouponType.FIXED) {
      return Math.min(value, orderAmount);
    }

    if (coupon.type === CouponType.PERCENT) {
      const discount = (orderAmount * value) / 100;
      const cappedDiscount =
        maxDiscountAmount > 0
          ? Math.min(discount, maxDiscountAmount)
          : discount;
      return Math.min(cappedDiscount, orderAmount);
    }

    // SHIPPING coupon cannot be calculated here because shipping fee is not in request payload.
    return 0;
  }

  async create(createCouponDto: CreateCouponDto) {
    const isPublic = createCouponDto.isPublic ?? true;
    if (!isPublic && !createCouponDto.targetUserId) {
      throw new HttpException(
        'targetUserId is required when creating a private coupon',
        HttpStatus.BAD_REQUEST,
      );
    }

    const savedCoupon = await this.dataSource.transaction(async (manager) => {
      // 1. Validate coupon code uniqueness
      const existing = await manager.findOne(Coupon, {
        where: { code: createCouponDto.code },
      });
      if (existing) {
        throw new HttpException(
          'Coupon code already exists',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 2. Parse and validate dates
      const startDate = new Date(createCouponDto.startDate);
      const endDate = new Date(createCouponDto.endDate);

      if (startDate >= endDate) {
        throw new HttpException(
          'startDate must be before endDate',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (startDate < new Date()) {
        throw new HttpException(
          'startDate cannot be in the past',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 3. Validate business logic
      if (createCouponDto.value <= 0) {
        throw new HttpException(
          'Discount value must be greater than 0',
          HttpStatus.BAD_REQUEST,
        );
      }

      // For PERCENT type: maxDiscountAmount is required and must be > 0
      if (
        createCouponDto.type === CouponType.PERCENT &&
        createCouponDto.maxDiscountAmount <= 0
      ) {
        throw new HttpException(
          'maxDiscountAmount is required and must be > 0 for percent type coupons',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 4. Create coupon
      const coupon = manager.create(Coupon, {
        code: createCouponDto.code,
        name: createCouponDto.name,
        description: createCouponDto.description,
        type: createCouponDto.type,
        value: createCouponDto.value,
        minOrderAmount: createCouponDto.minOrderAmount,
        maxDiscountAmount: createCouponDto.maxDiscountAmount,
        maxUses: createCouponDto.maxUses,
        perUserLimit: createCouponDto.perUserLimit,
        applicableProduct: createCouponDto.applicableProduct,
        startDate,
        endDate,
        status: createCouponDto.status,
        isPublic,
        isActive: true,
        usedCount: 0,
      });

      const savedCoupon = await manager.save(coupon);
      return savedCoupon;
    });

    try {
      const notificationPayload = {
        title: `Mã giảm giá mới: ${savedCoupon.code}`,
        message: savedCoupon.description || 'Đã cập nhật mã giảm giá mới',
        type: NotificationType.DISCOUNT,
      };

      if (savedCoupon.isPublic) {
        this.notificationsService.createForBroadcast(notificationPayload);

        void this.notificationsService
          .createForAllActiveUsers(notificationPayload)
          .then((total) => {
            this.logger.log(
              `Public coupon notifications persisted: couponId=${savedCoupon.id}, total=${total}`,
            );
          })
          .catch((error: unknown) => {
            this.logger.error(
              `Public coupon notifications persist failed: couponId=${savedCoupon.id}, reason=${error instanceof Error ? error.message : 'unknown'}`,
            );
          });

        this.logger.log(
          `Public coupon notification broadcast: couponId=${savedCoupon.id}`,
        );
      } else {
        await this.notificationsService.create({
          ...notificationPayload,
          userId: createCouponDto.targetUserId!,
        });
        this.logger.log(
          `Private coupon notification sent: couponId=${savedCoupon.id}, user=${createCouponDto.targetUserId}`,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Coupon notification failed: couponId=${savedCoupon.id}, reason=${error instanceof Error ? error.message : 'unknown'}`,
      );
    }

    return savedCoupon;
  }

  async getAll(queryCouponDto: QueryCouponDto) {
    const {
      page,
      limit,
      search,
      sortBy = 'id',
      sortOrder = 'DESC',
      type,
    } = queryCouponDto;

    const queryBuilder = this.couponRepository.createQueryBuilder('coupon');

    if (type) queryBuilder.andWhere('coupon.type = :type', { type });

    if (search)
      queryBuilder.andWhere(
        '(coupon.name LIKE :search OR coupon.description LIKE :search)',
        { search: `%${search}%` },
      );

    queryBuilder.orderBy(`coupon.${sortBy}`, sortOrder);

    if (page && limit) queryBuilder.skip((page - 1) * limit).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    const response = {
      pagination: {
        total,
        page,
        limit,
      },
      data,
    };
    return response;
  }

  async getPublicActiveCoupons() {
    const now = new Date();

    return this.couponRepository
      .createQueryBuilder('coupon')
      .where('coupon.isPublic = :isPublic', { isPublic: true })
      .andWhere('coupon.isActive = :isActive', { isActive: true })
      .andWhere('coupon.status = :status', { status: CouponStatus.ACTIVE })
      .andWhere('coupon.startDate <= :now', { now })
      .andWhere('coupon.endDate >= :now', { now })
      .getMany();
  }

  async getBestPublicCoupon(payload: GetBestPublicCouponDto) {
    if (!payload.items?.length) return [];

    // 1. Gom nhóm bằng Map
    const quantityMap = payload.items.reduce((acc, item) => {
      acc.set(item.variantId, (acc.get(item.variantId) || 0) + item.quantity);
      return acc;
    }, new Map<number, number>());

    const variantIds = Array.from(quantityMap.keys());

    // 2. Query lấy variants
    const variants = await this.productVariantRepository.find({
      where: { id: In(variantIds), isActive: true },
      relations: ['product'],
    });

    // 3. Validate missing variants
    if (variants.length !== variantIds.length) {
      const foundIds = new Set(variants.map((v) => v.id));
      const missingIds = variantIds.filter((id) => !foundIds.has(id));
      throw new HttpException(
        `Invalid or inactive variants: ${missingIds.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // 4. Tính toán tổng tiền và gom productIds trong 1 vòng lặp duy nhất
    let orderAmount = 0;
    const productIds = new Set<number>();

    for (const variant of variants) {
      if (!variant.product?.isActive) {
        throw new HttpException(
          `Product for variant ${variant.id} is inactive or missing`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const quantity = quantityMap.get(variant.id) || 0;
      orderAmount += Number(variant.product.price || 0) * quantity;
      productIds.add(variant.productId); 
    }

    // 5. Fetch coupons
    const coupons = await this.getPublicActiveCoupons();

    // 6. Lọc coupon hợp lệ & tính luôn discount để tránh lặp lại mảng nhiều lần
    const eligibleCouponsWithDiscount = coupons
      .filter((coupon) => {
        const isShipping = coupon.type === CouponType.SHIPPING;
        const isExhausted =
          (coupon.maxUses || 0) > 0 &&
          (coupon.usedCount || 0) >= coupon.maxUses;
        const notMeetMinAmount =
          (Number(coupon.minOrderAmount) || 0) > orderAmount;
        const notApplicableProduct =
          coupon.applicableProduct && !productIds.has(coupon.applicableProduct);

        return !(
          isShipping ||
          isExhausted ||
          notMeetMinAmount ||
          notApplicableProduct
        );
      })
      .map((coupon) => ({
        coupon,
        discount: this.calculateDiscountAmount(coupon, orderAmount),
      }));

    if (!eligibleCouponsWithDiscount.length) return [];

    // 7. Tìm discount lớn nhất
    const maxDiscount = Math.max(
      ...eligibleCouponsWithDiscount.map((c) => c.discount),
    );

    // 8. Lấy ra các coupon tốt nhất và sort
    return eligibleCouponsWithDiscount
      .filter((c) => c.discount === maxDiscount)
      .map((c) => c.coupon) // Trả về lại object coupon gốc
      .sort((a, b) => {
        const endDateDiff =
          new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
        return endDateDiff !== 0 ? endDateDiff : a.id - b.id;
      });
  }

  async getOne(id: number) {
    const coupon = await this.couponRepository.findOne({ where: { id } });
    if (!coupon) {
      throw new HttpException('Coupon not found', HttpStatus.NOT_FOUND);
    }
    return coupon;
  }

  async update(id: number, updateCouponDto: UpdateCouponDto) {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Find coupon
      const coupon = await manager.findOne(Coupon, { where: { id } });
      if (!coupon) {
        throw new HttpException('Coupon not found', HttpStatus.NOT_FOUND);
      }

      // 2. If updating code, check uniqueness (exclude current coupon)
      if (updateCouponDto.code && updateCouponDto.code !== coupon.code) {
        const existing = await manager.findOne(Coupon, {
          where: { code: updateCouponDto.code },
        });
        if (existing) {
          throw new HttpException(
            'Coupon code already exists',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // 3. Validate dates if provided
      let startDate = coupon.startDate;
      let endDate = coupon.endDate;

      if (updateCouponDto.startDate || updateCouponDto.endDate) {
        if (updateCouponDto.startDate)
          startDate = new Date(updateCouponDto.startDate);
        if (updateCouponDto.endDate)
          endDate = new Date(updateCouponDto.endDate);

        if (startDate >= endDate) {
          throw new HttpException(
            'startDate must be before endDate',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // 4. Validate business logic
      if (updateCouponDto.value !== undefined && updateCouponDto.value <= 0) {
        throw new HttpException(
          'Discount value must be greater than 0',
          HttpStatus.BAD_REQUEST,
        );
      }

      // For PERCENT type validation
      const type = updateCouponDto.type ?? coupon.type;
      const maxDiscountAmount =
        updateCouponDto.maxDiscountAmount ?? coupon.maxDiscountAmount;

      if (type === CouponType.PERCENT && maxDiscountAmount <= 0) {
        throw new HttpException(
          'maxDiscountAmount is required and must be > 0 for percent type coupons',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 5. Update coupon
      this.couponRepository.merge(coupon, {
        ...updateCouponDto,
        startDate,
        endDate,
      });

      // 5. Lưu xuống DB
      return await this.couponRepository.save(coupon);
    });
  }

  async delete(id: number) {
    const coupon = await this.couponRepository.findOne({ where: { id } });
    if (!coupon)
      throw new HttpException('Coupon not found', HttpStatus.NOT_FOUND);

    coupon.isActive = false;
    await this.couponRepository.save(coupon);

    return {
      deleted: true,
      id,
      message: 'Coupon deleted successfully.',
    };
  }
}
