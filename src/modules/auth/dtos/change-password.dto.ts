import { MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StringRequired } from 'src/decorators/dto.decorator';

export class ChangePasswordDto {
  @StringRequired('Current password')
  @ApiProperty({ example: 'oldPassword123', description: 'Current account password' })
  currentPassword: string;

  @StringRequired('New password')
  @MinLength(6, { message: 'New password must be at least 6 characters' })
  @ApiProperty({ example: 'newPassword123', description: 'New password (min 6 characters)', minLength: 6 })
  newPassword: string;

  @StringRequired('Confirm password')
  @ApiProperty({ example: 'newPassword123', description: 'Must match new password' })
  confirmPassword: string;
}
