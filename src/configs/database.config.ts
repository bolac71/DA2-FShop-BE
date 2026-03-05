import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Database configuration factory
 * Entities are auto-loaded from modules using @Module imports
 * This follows NestJS best practices
 */
export const getDatabaseConfig = (
  config: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: config.get('DATABASE_HOST') || 'localhost',
  port: config.get('DATABASE_PORT') || 5432,
  username: config.get('DATABASE_USER') || 'username',
  password: config.get('DATABASE_PASSWORD') || '123456',
  database: config.get('DATABASE_NAME') || 'fshop_db',
  autoLoadEntities: true, // Entities loaded from modules
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
  logging: config.get('NODE_ENV') === 'development',
});
