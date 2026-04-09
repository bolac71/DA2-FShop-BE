import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';

const extractFirstValue = (items: unknown): string | undefined => {
  if (!Array.isArray(items) || items.length === 0) {
    return undefined;
  }

  const firstItem = items[0] as { value?: unknown };
  return typeof firstItem.value === 'string' ? firstItem.value : undefined;
};

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
      scope: ['profile', 'email'],
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ) {
    const { id, displayName, emails, photos } = profile;
    const primaryEmail = extractFirstValue(emails);
    const primaryPhoto = extractFirstValue(photos);

    const user = {
      googleId: id,
      email: primaryEmail,
      name: displayName,
      picture: primaryPhoto,
      accessToken,
      refreshToken,
    };

    return user;
  }
}
