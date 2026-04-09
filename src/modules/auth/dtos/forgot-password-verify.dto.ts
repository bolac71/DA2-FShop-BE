import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class ForgotPasswordVerifyDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsString({ message: 'Email must be a string' })
  @IsNotEmpty({ message: 'Email can not be empty' })
  @IsEmail({}, { message: 'Email is invalid' })
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString({ message: 'Code must be a string' })
  @Length(6, 6, { message: 'Code must be 6 digits' })
  code: string;
}
