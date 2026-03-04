import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from './modules/users/entities/user.entity';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USER || 'username',
  password: process.env.DATABASE_PASSWORD || '123456',
  database: process.env.DATABASE_NAME || 'fshop_db',
  entities: [User],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
