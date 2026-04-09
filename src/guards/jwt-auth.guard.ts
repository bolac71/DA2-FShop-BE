/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, HttpException, HttpStatus, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import type { JwtPayload } from 'src/strategies/jwt.strategy';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(@InjectRedis() private readonly redis: Redis) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isValid = (await super.canActivate(context)) as boolean;
    if (!isValid) return false;

    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user = request.user as any;

    // Check if token was issued before logout
    const logoutAtStr = await this.redis.get(`logout_at:${user.sub}`);
    if (logoutAtStr) {
      const logoutAtSeconds = parseInt(logoutAtStr, 10);
      const tokenIssuedAtSeconds = user.iat || 0;
      if (tokenIssuedAtSeconds < logoutAtSeconds) {
        throw new HttpException('Token has been revoked due to logout', HttpStatus.UNAUTHORIZED);
      }
    }

    return true;
  }
}

