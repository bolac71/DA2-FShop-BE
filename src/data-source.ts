import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User, Address, Wishlist, Brand, Category, Color, SizeType, Size, Product, ProductImage, ProductVariant } from './entities';

/**
 * TypeORM CLI DataSource configuration
 * Used for migration commands and database operations outside of NestJS app context
 */
dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USER || 'username',
  password: process.env.DATABASE_PASSWORD || '123456',
  database: process.env.DATABASE_NAME || 'fshop_db',
  entities: [User, Address, Wishlist, Brand, Category, Color, SizeType, Size, Product, ProductImage, ProductVariant],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
