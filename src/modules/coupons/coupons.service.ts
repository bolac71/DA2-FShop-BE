/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Coupon, CouponRedemption } from './entities';
import { CreateCouponDto, UpdateCouponDto } from './dtos';
import { CouponStatus, CouponType } from 'src/constants';
import { QueryCouponDto } from './dtos/query-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
    @InjectRepository(CouponRedemption)
    private readonly couponRedemptionRepository: Repository<CouponRedemption>,
    @InjectDataSource() private readonly dataSource: DataSource
  ) {}

  async create(createCouponDto: CreateCouponDto) {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Validate coupon code uniqueness
      const existing = await manager.findOne(Coupon, { where: { code: createCouponDto.code } });
      if (existing) {
        throw new HttpException('Coupon code already exists', HttpStatus.BAD_REQUEST);
      }

      // 2. Parse and validate dates
      const startDate = new Date(createCouponDto.startDate);
      const endDate = new Date(createCouponDto.endDate);

      if (startDate >= endDate) {
        throw new HttpException('startDate must be before endDate', HttpStatus.BAD_REQUEST);
      }

      if (startDate < new Date()) {
        throw new HttpException('startDate cannot be in the past', HttpStatus.BAD_REQUEST);
      }

      // 3. Validate business logic
      if (createCouponDto.value <= 0) {
        throw new HttpException('Discount value must be greater than 0', HttpStatus.BAD_REQUEST);
      }

      // For PERCENT type: maxDiscountAmount is required and must be > 0
      if (createCouponDto.type === CouponType.PERCENT && createCouponDto.maxDiscountAmount <= 0) {
        throw new HttpException('maxDiscountAmount is required and must be > 0 for percent type coupons', HttpStatus.BAD_REQUEST);
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
        isPublic: createCouponDto.isPublic ?? true,
        isActive: true,
        usedCount: 0,
      });

      const savedCoupon = await manager.save(coupon);
      return savedCoupon;
    });
  }

  async getAll(queryCouponDto: QueryCouponDto) {
    const {page, limit, search, sortBy = 'id', sortOrder = 'DESC', type} = queryCouponDto;

    const queryBuilder = this.couponRepository.createQueryBuilder('coupon');

    if (type) queryBuilder.andWhere('coupon.type = :type', { type });

    if (search) 
      queryBuilder.andWhere('(coupon.name LIKE :search OR coupon.description LIKE :search)', { search: `%${search}%` });

    queryBuilder.orderBy(`coupon.${sortBy}`, sortOrder);

    if (page && limit) 
      queryBuilder.skip((page - 1) * limit).take(limit);

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
    if (!coupon) throw new HttpException('Coupon not found', HttpStatus.NOT_FOUND);

    coupon.isActive = true;
    await this.couponRepository.save(coupon);

    return {
      deleted: true,
      id,
      message: 'Coupon deleted successfully.',
    };
  }
}
