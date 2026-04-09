import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length, MinLength } from 'class-validator';

export class ForgotPasswordResetDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsString({ message: 'Email must be a string' })
  @IsNotEmpty({ message: 'Email can not be empty' })
  @IsEmail({}, { message: 'Email is invalid' })
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString({ message: 'Code must be a string' })
  @Length(6, 6, { message: 'Code must be 6 digits' })
  code: string;

  @ApiProperty({ example: 'newPassword123', minLength: 6 })
  @IsString({ message: 'New password must be a string' })
  @MinLength(6, { message: 'New password must be at least 6 characters' })
  newPassword: string;

  @ApiProperty({ example: 'newPassword123' })
  @IsString({ message: 'Confirm password must be a string' })
  confirmPassword: string;
}
