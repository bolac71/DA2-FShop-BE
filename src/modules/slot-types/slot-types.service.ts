import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { SlotType } from './entities/slot-type.entity';
import { CreateSlotTypeDto, UpdateSlotTypeDto } from './dtos';
import { QueryDto } from 'src/dtos/query.dto';

@Injectable()
export class SlotTypesService {
  constructor(
    @InjectRepository(SlotType)
    private slotTypeRepository: Repository<SlotType>,
  ) {}

  async create(dto: CreateSlotTypeDto) {
    const existingByName = await this.slotTypeRepository.findOne({
      where: { name: dto.name },
    });
    if (existingByName) {
      throw new HttpException('Slot type name already exists', HttpStatus.CONFLICT);
    }

    const existingByCode = await this.slotTypeRepository.findOne({
      where: { code: dto.code.toLowerCase().trim() },
    });
    if (existingByCode) {
      throw new HttpException('Slot type code already exists', HttpStatus.CONFLICT);
    }

    const slotType = this.slotTypeRepository.create({
      ...dto,
      code: dto.code.toLowerCase().trim(),
    });
    return await this.slotTypeRepository.save(slotType);
  }

  async findAll(query: QueryDto) {
    const { page, limit, search, sortBy = 'id', sortOrder = 'ASC' } = query;
    const [data, total] = await this.slotTypeRepository.findAndCount({
      where: search
        ? [{ isActive: true, name: ILike(`%${search}%`) }, { isActive: true, code: ILike(`%${search}%`) }]
        : { isActive: true },
      ...(page && limit && { take: limit, skip: (page - 1) * limit }),
      order: { [sortBy]: sortOrder },
    });

    return {
      pagination: {
        total,
        page,
        limit,
      },
      data,
    };
  }

  async findOne(id: number) {
    const slotType = await this.slotTypeRepository.findOne({
      where: { id },
    });
    if (!slotType) {
      throw new HttpException(`Slot type with id ${id} not found`, HttpStatus.NOT_FOUND);
    }
    return slotType;
  }

  async update(id: number, dto: UpdateSlotTypeDto) {
    const slotType = await this.findOne(id);

    if (dto.name && dto.name !== slotType.name) {
      const existing = await this.slotTypeRepository.findOne({
        where: { name: dto.name },
      });
      if (existing) {
        throw new HttpException('Slot type name already exists', HttpStatus.CONFLICT);
      }
    }

    if (dto.code && dto.code.toLowerCase().trim() !== slotType.code) {
      const existing = await this.slotTypeRepository.findOne({
        where: { code: dto.code.toLowerCase().trim() },
      });
      if (existing) {
        throw new HttpException('Slot type code already exists', HttpStatus.CONFLICT);
      }
    }

    Object.assign(slotType, {
      ...dto,
      code: dto.code ? dto.code.toLowerCase().trim() : slotType.code,
    });
    return await this.slotTypeRepository.save(slotType);
  }

  async remove(id: number) {
    const slotType = await this.findOne(id);
    if (!slotType.isActive) {
      throw new HttpException('Slot type is already disabled', HttpStatus.BAD_REQUEST);
    }

    await this.slotTypeRepository.update({ id }, { isActive: false });
    return {
      message: 'Slot type disabled successfully',
      deletedId: id,
    };
  }
}
