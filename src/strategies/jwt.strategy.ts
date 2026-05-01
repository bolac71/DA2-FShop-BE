import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from 'src/constants/role.enum';

export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
  cartId?: number;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'default_jwt_secret'),
    });
  }

  validate(payload: JwtPayload): JwtPayload & { id: number } {
    // Normalize payload to include `id` for compatibility across codebase
    // (some parts expect `user.sub`, others expect `user.id`).
    return {
      ...payload,
      id: payload.sub,
    } as JwtPayload & { id: number };
  }
}
