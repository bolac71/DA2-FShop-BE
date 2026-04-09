/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { InjectRedis } from '@nestjs-modules/ioredis';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brand } from 'src/entities';
import { Repository, DataSource, ILike, In } from 'typeorm';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import Redis from 'ioredis';
import { QueryDto } from 'src/dtos/query.dto';
import { CreateBrandDto } from './dtos/create-brand.dto';
import { UpdateBrandDto } from './dtos/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand) private brandRepository: Repository<Brand>,
    @InjectRedis() private readonly redis: Redis,
    private dataSource: DataSource,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(createBrandDto: CreateBrandDto, file: Express.Multer.File) {
    return await this.dataSource.transaction(async (manager) => {
      const alreadyExist = await manager.findOne(Brand, {
        where: { name: createBrandDto.name },
      });
      if (alreadyExist)
        throw new HttpException('Brand already exist', HttpStatus.CONFLICT);

      let imageUrl: string | undefined;
      let publicId: string | undefined;

      if (file) {
        const uploaded = await this.cloudinaryService.uploadFile(file);
        imageUrl = uploaded?.secure_url;
        publicId = uploaded?.public_id;
      }

      const brand = this.brandRepository.create({
        ...createBrandDto,
        imageUrl,
        publicId,
      });
      await manager.save(brand);
      return brand;
    });
  }

  async findAll(query: QueryDto) {
    const { page, limit, search, sortBy = 'id', sortOrder = 'DESC' } = query;
    const [data, total] = await this.brandRepository.findAndCount({
      where: search
        ? [{ isActive: true, name: ILike(`%${search}%`) }]
        : { isActive: true },
      ...(page && limit && { take: limit, skip: (page - 1) * limit }),
      order: { [sortBy]: sortOrder },
    });
    const response = {
      pagination: {
        total,
        page,
        limit,
      },
      data,
    };
    console.log('data lay tu DB');
    return response;
  }

  async update(
    id: number,
    updateBrandDto: UpdateBrandDto,
    file: Express.Multer.File,
  ) {
    return await this.dataSource.transaction(async (manager) => {
      const brand = await manager.findOne(Brand, {
        where: { id, isActive: true },
      });
      if (!brand)
        throw new HttpException('Brand not found', HttpStatus.NOT_FOUND);
      if (updateBrandDto.name && updateBrandDto.name !== brand.name) {
        const existingName = await manager.findOne(Brand, {
          where: { name: updateBrandDto.name },
        });
        if (existingName)
          throw new HttpException('Brand name already exists', HttpStatus.CONFLICT);
      }
      manager.merge(Brand, brand, updateBrandDto);
      let oldPublicId: string | null = null;
      if (file) {
          const uploaded = await this.cloudinaryService.uploadFile(file);
          if (brand.publicId)
            oldPublicId = brand.publicId;
          brand.imageUrl = uploaded?.secure_url;
          brand.publicId = uploaded?.public_id;
        }
        const savedBrand = await manager.save(brand);
        if (oldPublicId) {
          this.cloudinaryService.deleteFile(oldPublicId).catch((err) => {
            console.error('Failed to delete old image on Cloudinary:', err);
          });
        }
        return savedBrand;
    });
  }

  async delete(id: number) {
    return await this.dataSource.transaction(async (manager) => {
      const brand = await manager.findOne(Brand, {
        where: { id, isActive: true },
      });
      if (!brand)
        throw new HttpException('Brand not found', HttpStatus.NOT_FOUND);

      if (brand.publicId)
        await this.cloudinaryService
          .deleteFile(brand.publicId)
          .catch(() => null);

      await manager.update(Brand, { id }, { isActive: false });
      return {
        message: 'Brand disabled successfully',
        deletedId: id,
      };
    });
  }

  async getById(id: number) {
    const brand = await this.brandRepository.findOne({ where: { id } });
    if (!brand)
      throw new HttpException('Brand not found', HttpStatus.NOT_FOUND);
    return brand;
  }

  async getBySlug(slug: string) {
    const brand = await this.brandRepository.findOne({ where: { slug } });
    if (!brand)
      throw new HttpException('Brand not found', HttpStatus.NOT_FOUND);
    return brand;
  }
}
