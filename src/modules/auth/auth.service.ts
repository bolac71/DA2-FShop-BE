/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { UsersService } from '../users/users.service';
import { comparePassword, hashPassword } from 'src/utils/hash';
import { Role } from 'src/constants/role.enum';
import { LoginDto, GoogleLoginDto } from './dtos';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { UpdateMeDto } from './dtos/update-me.dto';
import { GoogleOAuthUtil, GoogleProfile } from 'src/utils/google-oauth.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
    private readonly googleOAuthUtil: GoogleOAuthUtil,
  ) {}

  private generateAccessToken(userId: number, email: string, role: Role, cartId?: number): string {
    return this.jwtService.sign({ sub: userId, email, role, ...(cartId && { cartId }) });
  }

  private generateRefreshToken(userId: number, email: string, role: Role, cartId?: number): string {
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is required');
    }

    return this.jwtService.sign(
      { sub: userId, email, role, ...(cartId && { cartId }) },
      {
        secret: refreshSecret,
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') as any,
      },
    );
  }

  private getRefreshCookieOptions() {
    const refreshExpirySeconds = Number(this.configService.get<string>('JWT_REFRESH_EXPIRATION_SECONDS'));

    return {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict' as const,
      maxAge: (Number.isFinite(refreshExpirySeconds) ? refreshExpirySeconds : 0) * 1000,
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

    const refreshExpirySeconds = Number(this.configService.get<string>('JWT_REFRESH_EXPIRATION_SECONDS'));
    if (!Number.isFinite(refreshExpirySeconds) || refreshExpirySeconds <= 0) {
      throw new Error('JWT_REFRESH_EXPIRATION_SECONDS is required');
    }
    await this.redis.set(`refresh_token:${user.id}`, refreshToken, 'EX', refreshExpirySeconds);

    const { password: _password, publicId: _publicId, ...userInfo } = user;
    return { accessToken, refreshToken, user: userInfo };
  }

  async loginWithGoogle(googleLoginDto: GoogleLoginDto) {
    // 1. Verify Google token
    let googleProfile: GoogleProfile;
    try {
      googleProfile = await this.googleOAuthUtil.verifyToken(googleLoginDto.idToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid Google token';
      throw new HttpException(message, HttpStatus.UNAUTHORIZED);
    }

    // 2. Check if user exists with this Google ID
    let user = await this.usersService.findByGoogleId(googleProfile.id).catch(() => null);

    // 3. If user doesn't exist, check if email exists
    if (!user) {
      const existingUser = await this.usersService.findByEmail(googleProfile.email).catch(() => null);
      if (existingUser && !existingUser.googleId) {
        // Email exists but not linked to Google - user must explicitly link
        throw new HttpException(
          'Email already registered. Please link your Google account in settings or login with email/password',
          HttpStatus.CONFLICT,
        );
      }

      // 4. Create new user if this is first Google login
      user = await this.usersService.createGoogleUser({
        email: googleProfile.email,
        fullName: googleProfile.name,
        avatar: googleProfile.picture,
        googleId: googleProfile.id,
      });
    }

    if (!user.isActive) {
      throw new HttpException('User account is inactive', HttpStatus.FORBIDDEN);
    }

    // 5. Generate tokens
    const userWithCart = await this.usersService.findByIdWithCart(user.id);
    const cartId = userWithCart?.cart?.id;

    const accessToken = this.generateAccessToken(user.id, user.email, user.role, cartId);
    const refreshToken = this.generateRefreshToken(user.id, user.email, user.role, cartId);

    const refreshExpirySeconds = Number(this.configService.get<string>('JWT_REFRESH_EXPIRATION_SECONDS'));
    if (!Number.isFinite(refreshExpirySeconds) || refreshExpirySeconds <= 0) {
      throw new Error('JWT_REFRESH_EXPIRATION_SECONDS is required');
    }
    await this.redis.set(`refresh_token:${user.id}`, refreshToken, 'EX', refreshExpirySeconds);

    const { password: _password, publicId: _publicId, ...userInfo } = user;
    return { accessToken, refreshToken, user: userInfo };
  }

  async refresh(refreshToken: string) {
    try {
      const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
      if (!refreshSecret) {
        throw new Error('JWT_REFRESH_SECRET is required');
      }

      const payload = this.jwtService.verify<{ sub: number; email: string; role: Role; cartId?: number }>(
        refreshToken,
        { secret: refreshSecret },
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

      const refreshExpirySeconds = Number(this.configService.get<string>('JWT_REFRESH_EXPIRATION_SECONDS'));
      if (!Number.isFinite(refreshExpirySeconds) || refreshExpirySeconds <= 0) {
        throw new Error('JWT_REFRESH_EXPIRATION_SECONDS is required');
      }
      await this.redis.set(`refresh_token:${user.id}`, newRefreshToken, 'EX', refreshExpirySeconds);

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch {
      throw new HttpException('Invalid or expired refresh token', HttpStatus.UNAUTHORIZED);
    }
  }

  async logout(userId: number): Promise<void> {
    // Store logout timestamp to invalidate all tokens issued before this time
    const logoutAtSeconds = Math.floor(Date.now() / 1000);
    const refreshExpirySeconds = Number(this.configService.get<string>('JWT_REFRESH_EXPIRATION_SECONDS'));
    if (!Number.isFinite(refreshExpirySeconds) || refreshExpirySeconds <= 0) {
      throw new Error('JWT_REFRESH_EXPIRATION_SECONDS is required');
    }
    await this.redis.set(`logout_at:${userId}`, logoutAtSeconds.toString(), 'EX', refreshExpirySeconds);
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

  async updateMe(userId: number, dto: UpdateMeDto, file?: Express.Multer.File) {
    const user = await this.usersService.updateOwnProfile(userId, dto, file);
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

  async linkGoogleAccount(userId: number, idToken: string) {
    // 1. Verify Google token
    let googleProfile: GoogleProfile;
    try {
      googleProfile = await this.googleOAuthUtil.verifyToken(idToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid Google token';
      throw new HttpException(message, HttpStatus.UNAUTHORIZED);
    }

    // 2. Link the account
    const updatedUser = await this.usersService.linkGoogleAccount(
      userId,
      googleProfile.id,
    );

    const { password: _password, publicId: _publicId, ...userInfo } = updatedUser;
    return userInfo;
  }

  async unlinkGoogleAccount(userId: number) {
    const updatedUser = await this.usersService.unlinkGoogleAccount(userId);
    const { password: _password, publicId: _publicId, ...userInfo } = updatedUser;
    return userInfo;
  }
}
