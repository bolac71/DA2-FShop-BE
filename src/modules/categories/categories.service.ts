/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable, NotFoundException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dtos';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { QueryDto } from 'src/dtos/query.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
    @InjectRedis() private readonly redis: Redis,
    private dataSource: DataSource,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(createCategoryDto: CreateCategoryDto, file: Express.Multer.File) {
    return await this.dataSource.transaction(async (manager) => {
      // check trùng tên
      if (await manager.findOne(Category, { where: { name: createCategoryDto.name }}))
        throw new HttpException('Category already exist', HttpStatus.CONFLICT);

      // Upload ảnh
      let imageUrl: string | undefined;
      let publicId: string | undefined;

      if (file) {
        const uploaded = await this.cloudinaryService.uploadFile(file);
        imageUrl = uploaded?.secure_url;
        publicId = uploaded?.public_id;
      }

      const category = this.categoriesRepository.create({
        ...createCategoryDto,
        imageUrl,
        publicId,
      });
      await manager.save(category);

      return category;
    });
  }

  async findAll(query: QueryDto) {
    const { page, limit, search, sortBy = 'id', sortOrder = 'DESC' } = query;
    const [data, total] = await this.categoriesRepository.findAndCount({
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

  async getById(id: number) {
    const category = await this.categoriesRepository.findOne({
      where: { id, isActive: true },
    });
    if (!category)
      throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
    return category;
  }

  async getBySlug(slug: string) {
    const category = await this.categoriesRepository.findOne({
      where: { slug, isActive: true },
    });
    if (!category)
      throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
    return category;
  }

  async update(
      id: number,
      updateCategoryDto: UpdateCategoryDto,
      file?: Express.Multer.File,
    ) {
      return await this.dataSource.transaction(async (manager) => {
        const category = await manager.findOne(Category, {
          where: { id, isActive: true },
        });
        if (!category)
          throw new HttpException('Category not found', HttpStatus.NOT_FOUND);

        if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
          const existingName = await manager.findOne(Category, {
            where: { name: updateCategoryDto.name },
          });
          if (existingName)
            throw new HttpException('Category name already exists', HttpStatus.CONFLICT);
        }
        manager.merge(Category, category, updateCategoryDto); // merge
        let oldPublicId: string | null = null;
        if (file) {
          const uploaded = await this.cloudinaryService.uploadFile(file);
          if (category.publicId)
            oldPublicId = category.publicId;
          category.imageUrl = uploaded?.secure_url;
          category.publicId = uploaded?.public_id;
        }
        const savedCategory = await manager.save(category);
        if (oldPublicId) {
          this.cloudinaryService.deleteFile(oldPublicId).catch((err) => {
            console.error('Failed to delete old image on Cloudinary:', err);
          });
        }
        return savedCategory;
      });
  }

  async delete(id: number) {
    return await this.dataSource.transaction(async (manager) => {
      const category = await manager.findOne(Category, {
        where: { id, isActive: true },
      });
      if (!category)
        throw new HttpException('Category not found', HttpStatus.NOT_FOUND);

      if (category.publicId)
        await this.cloudinaryService
          .deleteFile(category.publicId)
          .catch(() => null);
      await manager.update(Category, id, { isActive: false });
      return {
        message: 'Category disabled successfully',
        deletedId: id,
      };
    });
  }
}
