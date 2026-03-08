/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { UsersService } from '../users/users.service';
import { comparePassword, hashPassword } from 'src/utils/hash';
import { Role } from 'src/constants/role.enum';
import { LoginDto } from './dtos/login.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  private generateAccessToken(userId: number, email: string, role: Role, cartId?: number): string {
    return this.jwtService.sign({ sub: userId, email, role, ...(cartId && { cartId }) });
  }

  private generateRefreshToken(userId: number, email: string, role: Role, cartId?: number): string {
    return this.jwtService.sign(
      { sub: userId, email, role, ...(cartId && { cartId }) },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'default_refresh_secret'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d') as any,
      },
    );
  }

  private getRefreshCookieOptions() {
    return {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict' as const,
      maxAge: this.configService.get<number>('JWT_REFRESH_EXPIRATION_SECONDS', 604800) * 1000,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email).catch(() => null);
    if (!user || !user.isActive) {
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    const isMatch = await comparePassword(loginDto.password, user.password);
    if (!isMatch) {
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    // Get user's cart
    const userWithCart = await this.usersService.findByIdWithCart(user.id);
    const cartId = userWithCart?.cart?.id;

    const accessToken = this.generateAccessToken(user.id, user.email, user.role, cartId);
    const refreshToken = this.generateRefreshToken(user.id, user.email, user.role, cartId);

    const refreshExpirySeconds = this.configService.get<number>('JWT_REFRESH_EXPIRATION_SECONDS', 604800);
    await this.redis.set(`refresh_token:${user.id}`, refreshToken, 'EX', refreshExpirySeconds);

    const { password: _password, publicId: _publicId, ...userInfo } = user;
    return { accessToken, refreshToken, user: userInfo };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<{ sub: number; email: string; role: Role; cartId?: number }>(
        refreshToken,
        { secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'default_refresh_secret') },
      );

      const stored = await this.redis.get(`refresh_token:${payload.sub}`);
      if (!stored || stored !== refreshToken) {
        throw new HttpException('Refresh token mismatch', HttpStatus.UNAUTHORIZED);
      }

      const user = await this.usersService.findById(payload.sub);
      if (!user.isActive) {
        throw new HttpException('User is inactive', HttpStatus.FORBIDDEN);
      }

      const newAccessToken = this.generateAccessToken(user.id, user.email, user.role, payload.cartId);
      const newRefreshToken = this.generateRefreshToken(user.id, user.email, user.role, payload.cartId);

      const refreshExpirySeconds = this.configService.get<number>('JWT_REFRESH_EXPIRATION_SECONDS', 604800);
      await this.redis.set(`refresh_token:${user.id}`, newRefreshToken, 'EX', refreshExpirySeconds);

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch {
      throw new HttpException('Invalid or expired refresh token', HttpStatus.UNAUTHORIZED);
    }
  }

  async logout(userId: number): Promise<void> {
    // Store logout timestamp to invalidate all tokens issued before this time
    const logoutAtSeconds = Math.floor(Date.now() / 1000);
    await this.redis.set(`logout_at:${userId}`, logoutAtSeconds.toString(), 'EX', 604800); // TTL 7 days
    // Also clear refresh token
    await this.redis.del(`refresh_token:${userId}`);
  }

  async isTokenBlacklisted(userId: number, tokenIssuedAt: number): Promise<boolean> {
    const logoutAtStr = await this.redis.get(`logout_at:${userId}`);
    if (!logoutAtStr) return false;
    const logoutAtSeconds = parseInt(logoutAtStr, 10);
    return tokenIssuedAt < logoutAtSeconds;
  }

  async getMe(userId: number) {
    const user = await this.usersService.findById(userId);
    const { password: _password, publicId: _publicId, ...userInfo } = user;
    return userInfo;
  }

  async changePassword(userId: number, dto: ChangePasswordDto): Promise<void> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new HttpException('New password and confirm password do not match', HttpStatus.BAD_REQUEST);
    }

    const user = await this.usersService.findById(userId);

    const isMatch = await comparePassword(dto.currentPassword, user.password);
    if (!isMatch) {
      throw new HttpException('Current password is incorrect', HttpStatus.BAD_REQUEST);
    }

    const hashed = await hashPassword(dto.newPassword);
    await this.usersService.updatePassword(userId, hashed);

    // Invalidate refresh token to force re-login on all devices
    await this.redis.del(`refresh_token:${userId}`);
  }

  getCookieOptions() {
    return this.getRefreshCookieOptions();
  }
}
