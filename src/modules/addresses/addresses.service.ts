import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Address, User } from 'src/entities';
import { ILike, Repository } from 'typeorm';
import { CreateAddressDto, UpdateAddressDto } from './dtos';
import { QueryDto } from 'src/dtos/query.dto';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(Address) private addressRepository: Repository<Address>,
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  async create(userId: number, createAddressDto: CreateAddressDto) {
    const { isDefault } = createAddressDto;
    const user = await this.userRepository.findOne({ where: { id: userId, isActive: true } });
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    if (isDefault)
      await this.addressRepository.update(
        { userId, isDefault: true },
        { isDefault: false },
      );

    const newAddress = this.addressRepository.create({
      ...createAddressDto,
      user: user,
      isDefault: isDefault || false,
    });
    return await this.addressRepository.save(newAddress);
  }

  async findAll(query: QueryDto) {
    const { page, limit, search, sortBy = 'id', sortOrder = 'DESC' } = query;
    const [data, total] = await this.addressRepository.findAndCount({
      where: search
              ? [
                  { isActive: true, district: ILike(`%${search}%`) },
                  { isActive: true, province: ILike(`%${search}%`) },
                  { isActive: true, commune: ILike(`%${search}%`) },
                  { isActive: true, detailAddress: ILike(`%${search}%`) },
                ]
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

  async getMyAddresses(userId: number) {
    const addresses = await this.addressRepository.find({ where: { user: { id: userId }, isActive: true } });
    return addresses;
  }

  async getAddressById(userId: number, addressId: number) {
    const address = await this.addressRepository.findOne({ where: { id: addressId, user: { id: userId }, isActive: true } });
    if (!address) throw new HttpException('Address not found', HttpStatus.NOT_FOUND);
    return address;
  }

  async delete(id: number) {
    const address = await this.addressRepository.findOne({ where: { id, isActive: true } });
    if (!address) throw new HttpException('Address not found', HttpStatus.NOT_FOUND);
    await this.addressRepository.update({ id }, { isActive: false });
    return {
      message: 'Address soft deleted successfully',
      deletedId: id,
    };
  }

  async update(userId: number, id: number, updateAddressDto: UpdateAddressDto) {
    const address = await this.addressRepository.findOne({ where: {id, isActive: true, user: {id: userId}}, relations: ['user']})
    if (!address) throw new HttpException('Address not found', HttpStatus.NOT_FOUND)

    const { isDefault } = updateAddressDto;
    if (isDefault) {
      await this.addressRepository.update(
        { user: { id: address.user.id }, isDefault: true },
        { isDefault: false },
      )
      address.isDefault = true;
    }
    console.log(updateAddressDto)
    Object.assign(address, updateAddressDto); // merge
    console.log(address)
    await this.addressRepository.save(address)
    return { message: 'Address updated successfully' }
  }

  async setDefault(userId: number, addressId: number) {
    const address = await this.addressRepository.findOne({
      where: { id: addressId, user: { id: userId }, isActive: true },
    });

    if (!address) throw new HttpException('Address not found', HttpStatus.NOT_FOUND);
    
    if (address.isDefault) return { message: 'Address is already set as default' };

    await this.addressRepository.update({ user: { id: userId }, isDefault: true }, { isDefault: false });

    address.isDefault = true;
    await this.addressRepository.save(address);

    return {
      message: 'Set default address successfully',
      data: address,
      };
  }
}
