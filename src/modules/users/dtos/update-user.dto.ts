import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { Role } from 'src/constants/role.enum';
import { StringOptional } from 'src/decorators/dto.decorator';

export class UpdateUserDto {
  @StringOptional()
  fullName: string;

  @StringOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(Role)
  @ApiProperty({ enum: Role })
  role: Role;

  @IsOptional()
  @IsString()
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'File avatar',
    required: false,
  })
  avatar?: string;
}
