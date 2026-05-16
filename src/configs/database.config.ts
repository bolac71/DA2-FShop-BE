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
  // Use DB_* environment variables (DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME)
  host: config.get<string>('DB_HOST') as string,
  port: config.get('DB_PORT') ? parseInt(config.get<string>('DB_PORT') as string, 10) : undefined,
  username: config.get<string>('DB_USERNAME') as string,
  password: config.get<string>('DB_PASSWORD') as string,
  database: config.get<string>('DB_NAME') as string,
  autoLoadEntities: true, // Entities loaded from modules
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
  logging: config.get('NODE_ENV') === 'development',
  // Enable ssl when DB_USE_SSL=true (useful for managed DBs like Neon)
  ssl: config.get<string>('DB_USE_SSL') === 'true' ? { rejectUnauthorized: false } : undefined,
});
