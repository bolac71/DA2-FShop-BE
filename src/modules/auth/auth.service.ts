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
import { ForgotPasswordRequestDto } from './dtos/forgot-password-request.dto';
import { ForgotPasswordVerifyDto } from './dtos/forgot-password-verify.dto';
import { ForgotPasswordResetDto } from './dtos/forgot-password-reset.dto';
import nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  private static readonly FORGOT_PASSWORD_CODE_TTL_SECONDS = 10 * 60;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
    private readonly googleOAuthUtil: GoogleOAuthUtil,
  ) {}

  private getForgotPasswordCodeKey(email: string) {
    return `forgot_password:code:${email.toLowerCase()}`;
  }

  private getForgotPasswordVerifiedKey(email: string) {
    return `forgot_password:verified:${email.toLowerCase()}`;
  }

  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async sendForgotPasswordEmail(email: string, code: string) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT', '587'));
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const from = this.configService.get<string>('SMTP_FROM', user ?? 'no-reply@fshop.local');

    if (!host || !user || !pass) {
      throw new HttpException('Email service is not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    try {
      await transporter.verify();
      await transporter.sendMail({
        from,
        to: email,
        subject: 'FShop - Ma xac thuc quen mat khau',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
            <h2 style="margin: 0 0 12px;">Yeu cau dat lai mat khau</h2>
            <p>Ban vua yeu cau dat lai mat khau cho tai khoan FShop.</p>
            <p>Ma xac thuc cua ban la:</p>
            <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 12px 0;">${code}</div>
            <p>Ma co hieu luc trong 10 phut.</p>
            <p>Neu ban khong yeu cau dat lai mat khau, vui long bo qua email nay.</p>
          </div>
        `,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown email sending error';
      throw new HttpException(`Failed to send verification email: ${errorMessage}`, HttpStatus.BAD_GATEWAY);
    }
  }

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

  async requestForgotPassword(dto: ForgotPasswordRequestDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(email).catch(() => null);

    // Always return success message to avoid leaking account existence.
    if (!user || !user.isActive) {
      return { message: 'If the email exists, a verification code has been sent' };
    }

    const code = this.generateVerificationCode();
    await this.redis.set(
      this.getForgotPasswordCodeKey(email),
      code,
      'EX',
      AuthService.FORGOT_PASSWORD_CODE_TTL_SECONDS,
    );

    await this.redis.del(this.getForgotPasswordVerifiedKey(email));
    try {
      await this.sendForgotPasswordEmail(email, code);
    } catch (error) {
      await this.redis.del(this.getForgotPasswordCodeKey(email));
      await this.redis.del(this.getForgotPasswordVerifiedKey(email));
      // eslint-disable-next-line no-console
      console.warn(`[forgot-password] SMTP failed for ${email}; verification code: ${code}`);
      throw error;
    }

    return { message: 'If the email exists, a verification code has been sent' };
  }

  async verifyForgotPasswordCode(dto: ForgotPasswordVerifyDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(email).catch(() => null);
    if (!user || !user.isActive) {
      throw new HttpException('Invalid email or verification code', HttpStatus.BAD_REQUEST);
    }

    const storedCode = await this.redis.get(this.getForgotPasswordCodeKey(email));
    if (!storedCode || storedCode !== dto.code.trim()) {
      throw new HttpException('Invalid email or verification code', HttpStatus.BAD_REQUEST);
    }

    await this.redis.set(
      this.getForgotPasswordVerifiedKey(email),
      '1',
      'EX',
      AuthService.FORGOT_PASSWORD_CODE_TTL_SECONDS,
    );

    return { message: 'Verification code is valid' };
  }

  async resetForgotPassword(dto: ForgotPasswordResetDto) {
    const email = dto.email.trim().toLowerCase();
    const code = dto.code.trim();

    if (dto.newPassword !== dto.confirmPassword) {
      throw new HttpException('New password and confirm password do not match', HttpStatus.BAD_REQUEST);
    }

    const user = await this.usersService.findByEmail(email).catch(() => null);
    if (!user || !user.isActive) {
      throw new HttpException('Invalid reset request', HttpStatus.BAD_REQUEST);
    }

    const storedCode = await this.redis.get(this.getForgotPasswordCodeKey(email));
    if (!storedCode || storedCode !== code) {
      throw new HttpException('Invalid reset request', HttpStatus.BAD_REQUEST);
    }

    const hashed = await hashPassword(dto.newPassword);
    await this.usersService.updatePassword(user.id, hashed);

    await this.redis.del(`refresh_token:${user.id}`);
    await this.redis.del(this.getForgotPasswordCodeKey(email));
    await this.redis.del(this.getForgotPasswordVerifiedKey(email));

    return { message: 'Password has been reset successfully' };
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
