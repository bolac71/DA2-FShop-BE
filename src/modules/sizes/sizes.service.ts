import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import { Size } from './entities/size.entity';
import { CreateSizeDto, UpdateSizeDto } from './dtos';
import { QueryDto } from 'src/dtos/query.dto';

@Injectable()
export class SizesService {
  constructor(
    @InjectRepository(Size)
    private sizesRepository: Repository<Size>,
    private dataSource: DataSource,
  ) {}

  async create(createSizeDto: CreateSizeDto) {
    const size = this.sizesRepository.create(createSizeDto);
    return await this.sizesRepository.save(size);
  }

  async findAll(query: QueryDto) {
    const { page, limit, search, sortBy = 'sortOrder', sortOrder = 'ASC' } = query;
    const [data, total] = await this.sizesRepository.findAndCount({
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
    return response;
  }

  async findOne(id: number) {
    const size = await this.sizesRepository.findOne({
      where: { id },
    });
    if (!size) 
      throw new HttpException(`Size with id ${id} not found`, HttpStatus.NOT_FOUND);
    return size;
  }

  async update(id: number, updateSizeDto: UpdateSizeDto): Promise<Size> {
    const size = await this.findOne(id);

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
