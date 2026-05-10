import { Injectable } from '@nestjs/common';
import { generateSecret, generateURI, verifySync } from 'otplib';
import * as qrcode from 'qrcode';

@Injectable()
export class TotpService {
  /**
   * Generates a new TOTP secret and QR code URL for the given email.
   * @param email The user's email address
   * @returns An object containing the secret and the QR code data URL.
   */
  async generateSecret(email: string): Promise<{ secret: string; qrCodeUrl: string }> {
    const secret = generateSecret();
    const otpauthUrl = generateURI({ issuer: 'Agent Flow', label: email, secret });
    const qrCodeUrl = await qrcode.toDataURL(otpauthUrl);
    
    return {
      secret,
      qrCodeUrl,
    };
  }

  /**
   * Verifies a 6-digit TOTP token against the given secret.
   * @param secret The stored TOTP secret
   * @param token The 6-digit code provided by the user
   * @returns boolean indicating if the token is valid
   */
  verifyToken(secret: string, token: string): boolean {
    try {
      return verifySync({ token, secret }).valid;
    } catch (err) {
      return false;
    }
  }
}
