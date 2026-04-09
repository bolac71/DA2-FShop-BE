import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StringRequired } from 'src/decorators/dto.decorator';

export class LoginDto {
  @StringRequired('Email')
  @IsEmail({}, { message: 'Email is invalid' })
  @ApiProperty({ example: 'admin@gmail.com', description: 'User email' })
  email: string;

  @StringRequired('Password')
  @ApiProperty({ example: '123456', description: 'User password' })
  password: string;
}
