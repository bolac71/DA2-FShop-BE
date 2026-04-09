/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  ForgotPasswordRequestDto,
  ForgotPasswordResetDto,
  ForgotPasswordVerifyDto,
  GoogleLoginDto,
  LinkGoogleDto,
  LoginDto,
  UpdateMeDto,
} from './dtos';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import type { JwtPayload } from 'src/strategies/jwt.strategy';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password — returns access token; sets refresh token in HttpOnly cookie' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);
    res.cookie('refresh_token', result.refreshToken, this.authService.getCookieOptions());
    const { refreshToken: _rt, ...responseData } = result;
    return responseData;
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get new access token using refresh token cookie (token rotation)' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = (req.cookies as Record<string, string>)?.['refresh_token'];
    if (!refreshToken) {
      throw new HttpException('Refresh token not found', HttpStatus.UNAUTHORIZED);
    }
    const result = await this.authService.refresh(refreshToken);
    res.cookie('refresh_token', result.refreshToken, this.authService.getCookieOptions());
    return { accessToken: result.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout — invalidates refresh token and clears cookie' })
  async logout(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.sub);
    res.clearCookie('refresh_token');
    return { message: 'Logged out', timestamp: new Date().toISOString() };
  }

  @Post('google/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Login or sign up with Google — auto-creates account if email not exists; returns access token; sets refresh token in HttpOnly cookie',
  })
  async loginWithGoogle(
    @Body() googleLoginDto: GoogleLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.loginWithGoogle(googleLoginDto);
    res.cookie('refresh_token', result.refreshToken, this.authService.getCookieOptions());
    const { refreshToken: _rt, ...responseData } = result;
    return responseData;
  }

  @Post('google/link')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Link Google account to existing user account' })
  async linkGoogleAccount(
    @CurrentUser() user: JwtPayload,
    @Body() linkGoogleDto: LinkGoogleDto,
  ) {
    const userInfo = await this.authService.linkGoogleAccount(
      user.sub,
      linkGoogleDto.idToken,
    );
    return { message: 'Google account linked successfully', user: userInfo };
  }

  @Delete('google/unlink')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlink Google account from user account' })
  async unlinkGoogleAccount(@CurrentUser() user: JwtPayload) {
    const userInfo = await this.authService.unlinkGoogleAccount(user.sub);
    return { message: 'Google account unlinked successfully', user: userInfo };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async getMe(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user.sub);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update current authenticated user profile' })
  async updateMe(
    @CurrentUser() user: JwtPayload,
    @Body() updateMeDto: UpdateMeDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.authService.updateMe(user.sub, updateMeDto, file);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password — invalidates all sessions after success' })
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(user.sub, changePasswordDto);
    return null;
  }

  @Post('forgot-password/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send forgot password code to email' })
  async requestForgotPassword(@Body() dto: ForgotPasswordRequestDto) {
    return this.authService.requestForgotPassword(dto);
  }

  @Post('forgot-password/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify forgot password code' })
  async verifyForgotPasswordCode(@Body() dto: ForgotPasswordVerifyDto) {
    return this.authService.verifyForgotPasswordCode(dto);
  }

  @Post('forgot-password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with email and verification code' })
  async resetForgotPassword(@Body() dto: ForgotPasswordResetDto) {
    return this.authService.resetForgotPassword(dto);
  }
}
