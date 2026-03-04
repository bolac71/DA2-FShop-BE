import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../modules/users/entities/user.entity';

export const getDatabaseConfig = (
  config: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: config.get('DATABASE_HOST') || 'localhost',
  port: config.get('DATABASE_PORT') || 5432,
  username: config.get('DATABASE_USER') || 'username',
  password: config.get('DATABASE_PASSWORD') || '123456',
  database: config.get('DATABASE_NAME') || 'fshop_db',
  entities: [User],
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
  logging: config.get('NODE_ENV') === 'development',
});
