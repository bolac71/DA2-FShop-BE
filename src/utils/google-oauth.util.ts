import { Injectable, BadRequestException } from '@nestjs/common';

export interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

@Injectable()
export class GoogleOAuthUtil {
  private readonly googleTokenInfoEndpoint = 'https://oauth2.googleapis.com/tokeninfo';

  /**
   * Verify Google ID token and extract user profile
   * Calls Google's token info endpoint to validate the token
   * @param idToken - Google ID token from client
   * @returns Verified Google profile
   */
  async verifyToken(idToken: string): Promise<GoogleProfile> {
    const audience = process.env.GOOGLE_CLIENT_ID;
    if (!audience) {
      throw new BadRequestException('GOOGLE_CLIENT_ID is not configured');
    }

    try {
      const url = new URL(this.googleTokenInfoEndpoint);
      url.searchParams.append('id_token', idToken);

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new BadRequestException('Invalid Google token');
      }

      const data = (await response.json()) as {
        sub?: string;
        email?: string;
        name?: string;
        picture?: string;
        aud?: string;
        iss?: string;
      };

      // Validate required fields
      if (!data?.sub || !data?.email) {
        throw new BadRequestException('Invalid Google token: missing required fields');
      }

      // Validate token audience against configured client id
      if (data.aud !== audience) {
        throw new BadRequestException('Google token audience mismatch (wrong Client ID)');
      }

      // Validate issuer
      if (data.iss && data.iss !== 'accounts.google.com' && data.iss !== 'https://accounts.google.com') {
        throw new BadRequestException('Invalid Google token issuer');
      }

      // Extract user profile
      const googleProfile: GoogleProfile = {
        id: data.sub,
        email: data.email,
        name: data.name || '',
        picture: data.picture,
      };

      return googleProfile;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to verify Google token: ${errorMessage}`);
    }
  }
}
