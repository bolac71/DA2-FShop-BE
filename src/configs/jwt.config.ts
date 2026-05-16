/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export const getJwtConfig = (configService: ConfigService): JwtModuleOptions => ({
  secret: (() => {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is required');
    }
    return secret;
  })(),
  signOptions: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expiresIn: configService.get('JWT_ACCESS_EXPIRES_IN') as any,
  },
});
