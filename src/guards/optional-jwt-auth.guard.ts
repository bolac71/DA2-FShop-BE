/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import type { JwtPayload } from 'src/strategies/jwt.strategy';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  constructor(@InjectRedis() private readonly redis: Redis) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const isValid = (await super.canActivate(context)) as boolean;
      if (!isValid) return true;

      const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
      const user = request.user as any;

      if (!user?.sub) {
        return true;
      }

      const logoutAtStr = await this.redis.get(`logout_at:${user.sub}`);
      if (logoutAtStr) {
        const logoutAtSeconds = parseInt(logoutAtStr, 10);
        const tokenIssuedAtSeconds = user.iat || 0;
        if (tokenIssuedAtSeconds < logoutAtSeconds) {
          request.user = undefined;
          return true;
        }
      }

      return true;
    } catch {
      return true;
    }
  }
}