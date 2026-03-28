import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  generateOtp(): string {
    // Generate a 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOtp(recipient: string, code: string, type: 'email' | 'phone') {
    // In a real production application, you would integrate AWS SES/SendGrid or Twilio here.
    if (type === 'email') {
      this.logger.log(`[MOCK EMAIL] To: ${recipient} | Subject: Your Verification Code | Body: Your code is ${code}`);
    } else {
      this.logger.log(`[MOCK SMS] To: ${recipient} | Message: Your Agent Flow verification code is ${code}`);
    }
  }

  getExpiry(): Date {
    // OTPexpires in 10 minutes
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);
    return expiresAt;
  }
}
