/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Role } from '../../../constants/role.enum';
import { Address } from 'src/modules/addresses/entities/address.entity';
import { Wishlist } from 'src/modules/wishlists/entities/wishlist.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'full_name', type: 'varchar', nullable: true })
  fullName: string;

  @Column({ type: 'varchar', unique: true, nullable: false })
  email: string;

  @Column({ type: 'varchar', nullable: false })
  password: string;

  @Column({ type: 'varchar', nullable: true })
  avatar: string;

  @Column({ name: 'public_id', type: 'varchar', nullable: true })
  publicId: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.USER,
  })
  role: Role;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Address, (address) => address.user, { cascade: ['soft-remove'] })
  addresses: Address[];

  @OneToMany(() => Wishlist, (wishlist) => wishlist.user, { cascade: true })
  wishlists: Wishlist[];
}
