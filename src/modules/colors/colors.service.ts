import { Injectable, NotFoundException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import { Color } from './entities/color.entity';
import { CreateColorDto, UpdateColorDto } from './dtos';
import { QueryDto } from 'src/dtos/query.dto';

@Injectable()
export class ColorsService {
  constructor(
    @InjectRepository(Color)
    private colorsRepository: Repository<Color>,
    private dataSource: DataSource,
  ) {}

  async create(createColorDto: CreateColorDto) {
    const existingColor = await this.colorsRepository.findOne({
      where: { name: createColorDto.name },
    });

    if (existingColor) 
      throw new HttpException('Color name already exists', HttpStatus.CONFLICT);

    const color = this.colorsRepository.create(createColorDto);
    return await this.colorsRepository.save(color);
  }

  async findAll(query: QueryDto) {
    const { page, limit, search, sortBy = 'id', sortOrder = 'DESC' } = query;
    const [data, total] = await this.colorsRepository.findAndCount({
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
    const color = await this.colorsRepository.findOne({
      where: { id },
    });
    if (!color) 
      throw new HttpException(`Color with id ${id} not found`, HttpStatus.NOT_FOUND);
    return color;
  }

  async update(id: number, updateColorDto: UpdateColorDto): Promise<Color> {
    const color = await this.findOne(id);

    // Check if trying to update name to one that already exists
    if (updateColorDto.name && updateColorDto.name !== color.name) {
      const existingColor = await this.colorsRepository.findOne({
        where: { name: updateColorDto.name },
      });

      if (existingColor) 
        throw new HttpException('Color name already exists', HttpStatus.CONFLICT);
      
    }

    Object.assign(color, updateColorDto);
    return await this.colorsRepository.save(color);
  }

  async remove(id: number) {
    return await this.dataSource.transaction(async (manager) => {
          const color = await manager.findOne(Color, {
            where: { id, isActive: true },
          });
          if (!color)
            throw new HttpException('Color not found', HttpStatus.NOT_FOUND);
    
          await manager.update(Color, { id }, { isActive: false });
          return {
            message: 'Color disabled successfully',
            deletedId: id,
          };
        });
  }
}
