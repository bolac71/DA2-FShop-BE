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
import { MailService } from './mail.service';
import { ForgotPasswordRequestDto, ForgotPasswordVerifyDto, ForgotPasswordResetDto } from './dtos';


@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
    private readonly googleOAuthUtil: GoogleOAuthUtil,
    private readonly mailService: MailService,
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

  async updateMe(userId: number, dto: UpdateMeDto, avatarFile?: Express.Multer.File, coverFile?: Express.Multer.File) {
    const user = await this.usersService.updateOwnProfile(userId, dto, avatarFile, coverFile);
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

  async forgotPasswordRequest(dto: ForgotPasswordRequestDto) {
    const user = await this.usersService.findByEmail(dto.email).catch(() => null);
    if (!user) {
      throw new HttpException('Email không tồn tại trong hệ thống', HttpStatus.NOT_FOUND);
    }
    if (!user.isActive) {
      throw new HttpException('Tài khoản đã bị khóa', HttpStatus.FORBIDDEN);
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await this.redis.set(`forgot-password:otp:${dto.email}`, code, 'EX', 300);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #40BFFF; text-align: center;">Mã Xác Thực Quên Mật Khẩu</h2>
        <p>Chào bạn,</p>
        <p>Chúng tôi nhận được yêu cầu khôi phục mật khẩu từ tài khoản của bạn. Vui lòng sử dụng mã xác thực dưới đây để tiếp tục quá trình đặt lại mật khẩu:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1a202c; background-color: #f7fafc; padding: 10px 20px; border: 1px dashed #40BFFF; border-radius: 4px;">
            ${code}
          </span>
        </div>
        <p style="color: #718096; font-size: 14px;">Mã xác thực có hiệu lực trong vòng 5 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>
        <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
        <p style="font-size: 12px; color: #a0aec0; text-align: center;">Đây là email tự động từ hệ thống FShop. Vui lòng không trả lời email này.</p>
      </div>
    `;

    await this.mailService.sendMail({
      to: dto.email,
      subject: '[FShop] Mã xác thực khôi phục mật khẩu',
      html: htmlContent,
    });

    return { message: 'Mã xác thực đã được gửi đến email của bạn.' };
  }

  async forgotPasswordVerify(dto: ForgotPasswordVerifyDto) {
    const storedCode = await this.redis.get(`forgot-password:otp:${dto.email}`);
    if (!storedCode || storedCode !== dto.code) {
      throw new HttpException('Mã xác thực không đúng hoặc đã hết hạn', HttpStatus.BAD_REQUEST);
    }
    return { message: 'Mã xác thực hợp lệ.' };
  }

  async forgotPasswordReset(dto: ForgotPasswordResetDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new HttpException('Mật khẩu mới và xác nhận mật khẩu không trùng khớp', HttpStatus.BAD_REQUEST);
    }

    const storedCode = await this.redis.get(`forgot-password:otp:${dto.email}`);
    if (!storedCode || storedCode !== dto.code) {
      throw new HttpException('Mã xác thực không đúng hoặc đã hết hạn', HttpStatus.BAD_REQUEST);
    }

    const user = await this.usersService.findByEmail(dto.email).catch(() => null);
    if (!user) {
      throw new HttpException('Người dùng không tồn tại', HttpStatus.NOT_FOUND);
    }

    const hashed = await hashPassword(dto.newPassword);
    await this.usersService.updatePassword(user.id, hashed);

    await this.redis.del(`forgot-password:otp:${dto.email}`);
    await this.redis.del(`refresh_token:${user.id}`);

    return { message: 'Đặt lại mật khẩu thành công.' };
  }
}

