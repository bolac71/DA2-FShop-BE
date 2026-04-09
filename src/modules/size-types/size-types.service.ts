import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import { SizeType } from './entities/size-type.entity';
import { CreateSizeTypeDto, UpdateSizeTypeDto } from './dtos';
import { QueryDto } from 'src/dtos/query.dto';

@Injectable()
export class SizeTypesService {
  constructor(
    @InjectRepository(SizeType)
    private readonly sizeTypesRepository: Repository<SizeType>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createSizeTypeDto: CreateSizeTypeDto) {
    const { name } = createSizeTypeDto;

    // Check if size type with this name already exists
    const existingSizeType = await this.sizeTypesRepository.findOne({
      where: { name },
    });

    if (existingSizeType) {
      throw new HttpException(
        `Size type with name '${name}' already exists`,
        HttpStatus.CONFLICT,
      );
    }

    const sizeType = this.sizeTypesRepository.create(createSizeTypeDto);
    return await this.sizeTypesRepository.save(sizeType);
  }

  async findAll(query: QueryDto) {
    const { page, limit, search, sortBy = 'id', sortOrder = 'DESC' } = query;
    const [data, total] = await this.sizeTypesRepository.findAndCount({
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

  async findOne(id: number) {
    const sizeType = await this.sizeTypesRepository.findOne({
      where: { id, isActive: true },
    });

    if (!sizeType) {
      throw new HttpException(
        `Size type with ID ${id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return sizeType;
  }

  async update(id: number, updateSizeTypeDto: UpdateSizeTypeDto) {
    const sizeType = await this.findOne(id);

    // Check if new name already exists (if name is being updated)
    if (updateSizeTypeDto.name && updateSizeTypeDto.name !== sizeType.name) {
      const existingSizeType = await this.sizeTypesRepository.findOne({
        where: { name: updateSizeTypeDto.name },
      });

      if (existingSizeType) {
        throw new HttpException(
          `Size type with name '${updateSizeTypeDto.name}' already exists`,
          HttpStatus.CONFLICT,
        );
      }
    }

    await this.sizeTypesRepository.update(id, updateSizeTypeDto);
    return await this.findOne(id);
  }

  async remove(id: number) {
    return await this.dataSource.transaction(async (manager) => {
          const brand = await manager.findOne(SizeType, {
            where: { id, isActive: true },
          });
          if (!brand)
            throw new HttpException('Size type not found', HttpStatus.NOT_FOUND);
    
          await manager.update(SizeType, { id }, { isActive: false });
          return {
            message: 'Size type deleted successfully',
            deletedId: id,
          };
        });
  }
}
