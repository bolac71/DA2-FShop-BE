import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './modules/users/entities/user.entity';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
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
      }),
    }),
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
