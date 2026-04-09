import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StringRequired } from 'src/decorators/dto.decorator';

export class GoogleLoginDto {
  @StringRequired('Google ID Token')
  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjE0...',
    description: 'Google ID token from client-side sign-in',
  })
  idToken: string;
}

export class LinkGoogleDto {
  @StringRequired('Google ID Token')
  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjE0...',
    description: 'Google ID token for account linking',
  })
  idToken: string;
}
