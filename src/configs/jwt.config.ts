/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export const getJwtConfig = (configService: ConfigService): JwtModuleOptions => ({
  secret: configService.get<string>('JWT_SECRET', 'default_jwt_secret'),
  signOptions: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expiresIn: configService.get('JWT_ACCESS_EXPIRATION', '15m') as any,
  },
});
