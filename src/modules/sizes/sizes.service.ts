import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import { Size } from './entities/size.entity';
import { CreateSizeDto, UpdateSizeDto } from './dtos';
import { QueryDto } from 'src/dtos/query.dto';
import { SizeTypesService } from '../size-types/size-types.service';

@Injectable()
export class SizesService {
  constructor(
    @InjectRepository(Size)
    private sizesRepository: Repository<Size>,
    private dataSource: DataSource,
    private sizeTypesService: SizeTypesService,
  ) {}

  async create(createSizeDto: CreateSizeDto) {
    // Validate sizeTypeId exists
    await this.sizeTypesService.findOne(createSizeDto.sizeTypeId);

    const size = this.sizesRepository.create(createSizeDto);
    return await this.sizesRepository.save(size);
  }

  async findAll(query: QueryDto) {
    const { page, limit, search, sortBy = 'sortOrder', sortOrder = 'ASC' } = query;
    const [data, total] = await this.sizesRepository.findAndCount({
      where: search
        ? [{ isActive: true, name: ILike(`%${search}%`) }]
        : { isActive: true },
      relations: ['sizeType'],
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
    return response;
  }

  async findOne(id: number) {
    const size = await this.sizesRepository.findOne({
      where: { id, isActive: true },
      relations: ['sizeType'],
    });
    if (!size) 
      throw new HttpException(`Size with id ${id} not found`, HttpStatus.NOT_FOUND);
    return size;
  }

  async update(id: number, updateSizeDto: UpdateSizeDto): Promise<Size> {
    const size = await this.findOne(id);

    // Validate sizeTypeId if provided
    if (updateSizeDto.sizeTypeId) {
      await this.sizeTypesService.findOne(updateSizeDto.sizeTypeId);
    }

    Object.assign(size, updateSizeDto);
    return await this.sizesRepository.save(size);
  }

  async remove(id: number) {
    return await this.dataSource.transaction(async (manager) => {
      const size = await manager.findOne(Size, {
        where: { id, isActive: true },
      });

      if (!size) {
        throw new HttpException(`Size with id ${id} not found`, HttpStatus.NOT_FOUND);
      }

      size.isActive = false;
      return await manager.save(size);
    });
  }
}
