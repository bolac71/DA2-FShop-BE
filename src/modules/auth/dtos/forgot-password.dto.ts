import { IsEmail, MinLength, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StringRequired } from 'src/decorators/dto.decorator';

export class ForgotPasswordRequestDto {
  @StringRequired('Email')
  @IsEmail({}, { message: 'Email is invalid' })
  @ApiProperty({ example: 'user@gmail.com', description: 'User email' })
  email: string;
}

export class ForgotPasswordVerifyDto {
  @StringRequired('Email')
  @IsEmail({}, { message: 'Email is invalid' })
  @ApiProperty({ example: 'user@gmail.com', description: 'User email' })
  email: string;

  @StringRequired('Verification code')
  @IsString()
  @ApiProperty({ example: '123456', description: '6-digit OTP code' })
  code: string;
}

export class ForgotPasswordResetDto {
  @StringRequired('Email')
  @IsEmail({}, { message: 'Email is invalid' })
  @ApiProperty({ example: 'user@gmail.com', description: 'User email' })
  email: string;

  @StringRequired('Verification code')
  @IsString()
  @ApiProperty({ example: '123456', description: '6-digit OTP code' })
  code: string;

  @StringRequired('New password')
  @MinLength(6, { message: 'New password must be at least 6 characters' })
  @ApiProperty({ example: 'newPassword123', description: 'New password (min 6 characters)', minLength: 6 })
  newPassword: string;

  @StringRequired('Confirm password')
  @ApiProperty({ example: 'newPassword123', description: 'Must match new password' })
  confirmPassword: string;
}
