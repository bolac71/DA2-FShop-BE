import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { DataSource, ILike, Repository } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { hashPassword } from 'src/utils/hash';
import { QueryDto } from 'src/dtos/query.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { CartsService } from '../carts/carts.service';


@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
    @InjectRedis() private readonly redis: Redis,
    private dataSource: DataSource,
    private readonly cartService: CartsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(createUserDto: CreateUserDto, file?: Express.Multer.File) {
    if (
      await this.usersRepository.findOne({
        where: { email: createUserDto.email },
      })
    )
      throw new HttpException('Email already exists', HttpStatus.CONFLICT);
    const password = await hashPassword(createUserDto.password);

    let imageUrl: string | undefined;
    let publicId: string | undefined;

    if (file) {
      const uploaded = await this.cloudinaryService.uploadFile(file);
      imageUrl = uploaded?.secure_url;
      publicId = uploaded?.public_id;
    }

    const user = this.usersRepository.create({
      ...createUserDto,
      avatar: imageUrl,
      publicId,
      password,
      isVerified: true,
      isActive: true,
    });
    await this.usersRepository.save(user);
    await this.cartService.create({ userId: user.id });
    return user;
  }

  async findByEmail(email: string) {
    const user = await this.usersRepository.findOne({
      where: { email },
    });
    if (!user) throw new HttpException('Not found user', HttpStatus.NOT_FOUND);
    return user;
  }

  async updatePassword(id: number, hashedPassword: string) {
    await this.usersRepository.update(id, { password: hashedPassword });
  }

  async findById(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id, isActive: true },
    });
    if (!user) throw new HttpException('Not found user', HttpStatus.NOT_FOUND);
    return user;
  }

  async findByIdWithCart(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id, isActive: true },
      relations: ['cart'],
    });
    if (!user) throw new HttpException('Not found user', HttpStatus.NOT_FOUND);
    return user;
  }

  async findAll(query: QueryDto) {
    const { page, limit, search, sortBy = 'id', sortOrder = 'DESC' } = query;
    const [data, total] = await this.usersRepository.findAndCount({
      where: search
        ? [
            { isActive: true, fullName: ILike(`%${search}%`) },
            { isActive: true, email: ILike(`%${search}%`) },
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

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    file?: Express.Multer.File,
  ) {
    if (updateUserDto.email) {
      const existingEmail = await this.usersRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingEmail && existingEmail.id !== id)
        throw new HttpException('Email exists', HttpStatus.CONFLICT);
    }
    const existingUser = await this.usersRepository.findOne({ where: { id } });
    if (!existingUser)
      throw new HttpException('Not found user', HttpStatus.NOT_FOUND);
    Object.assign(existingUser, updateUserDto); // merge
    if (file) {
      if (existingUser.publicId) {
        await this.cloudinaryService
          .deleteFile(existingUser.publicId)
          .catch(() => null);
      }
      const uploaded = await this.cloudinaryService.uploadFile(file);
      existingUser.avatar = uploaded?.secure_url;
      existingUser.publicId = uploaded?.public_id;
    }
    return this.usersRepository.save(existingUser);
  }

  async remove(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id, isActive: true },
    });
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    user.isActive = false;
    user.email = `${user.email}_deleted_${Date.now()}`;
    await this.usersRepository.save(user);
    return {
      message: 'User soft deleted successfully',
      deletedId: id,
    };
  }
}
