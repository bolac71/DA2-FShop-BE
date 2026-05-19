import { ConfigService } from '@nestjs/config';
import { RedisModuleOptions } from '@nestjs-modules/ioredis';

export const getRedisConfig = (configService: ConfigService): RedisModuleOptions => {
    const useTls = configService.get<string>('REDIS_TLS') === 'true';

    return {
        type: 'single',
        options: {
            host: configService.get<string>('REDIS_HOST') as string,
            port: parseInt(configService.get<string>('REDIS_PORT') as string, 10),
            password: configService.get<string>('REDIS_PASSWORD'),
            ...(useTls ? { tls: {} } : {}),
        },
    };
};
