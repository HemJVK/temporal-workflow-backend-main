import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { OtpService } from './otp.service';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  private googleClient = new OAuth2Client('93727091909-pc7n4v5sefspk8j3qq38f4fsmo1ki2lk.apps.googleusercontent.com');

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private otpService: OtpService,
  ) {}

  async validateUser(email: string, pass: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (user && user.password_hash) {
      const isMatch = await bcrypt.compare(pass, user.password_hash);
      if (isMatch) {
        return user;
      }
    }
    return null;
  }

  async login(user: User) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        phone_number: user.phone_number,
        credits: user.credits,
        sso_id: user.sso_id
      }
    };
  }

  async register(data: { email?: string, password?: string, phone_number?: string, sso_id?: string }) {
    if (data.email) {
      const existing = await this.usersService.findByEmail(data.email);
      if (existing) throw new BadRequestException('Email already in use');
    }
    if (data.phone_number) {
      const existing = await this.usersService.findByPhone(data.phone_number);
      if (existing) throw new BadRequestException('Phone number already in use');
    }

    const userData: Partial<User> = {
      email: data.email,
      phone_number: data.phone_number,
      sso_id: data.sso_id,
    };

    if (data.password) {
      userData.password_hash = await bcrypt.hash(data.password, 10);
    }

    const newUser = await this.usersService.create(userData);
    
    // Generate and "send" OTP
    const otp = this.otpService.generateOtp();
    const expiresAt = this.otpService.getExpiry();
    await this.usersService.update(newUser.id, { otp_code: otp, otp_expires_at: expiresAt });
    
    if (data.phone_number) {
       await this.otpService.sendOtp(data.phone_number, otp, 'phone');
    } else if (data.email) {
       await this.otpService.sendOtp(data.email, otp, 'email');
    }

    return { message: 'OTP sent for verification', userId: newUser.id };
  }

  async verifyOtp(userId: string, code: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new BadRequestException('User not found');
    if (!user.otp_code || user.otp_code !== code) {
       throw new BadRequestException('Invalid OTP');
    }
    if (!user.otp_expires_at || user.otp_expires_at < new Date()) {
       throw new BadRequestException('OTP expired');
    }

    // Mark as verified and assign credits if phone was provided
    let credits = user.credits;
    const isPhone = !!user.phone_number;
    if (isPhone && !user.is_phone_verified) {
       credits = 30; // Grant 30 credits for first-time phone verification
    }

    await this.usersService.update(user.id, {
       otp_code: null,
       otp_expires_at: null,
       is_phone_verified: isPhone ? true : user.is_phone_verified,
       is_email_verified: !isPhone && user.email ? true : user.is_email_verified,
       credits
    });

    const updatedUser = await this.usersService.findById(user.id) as User;
    return this.login(updatedUser);
  }

  async markTutorialSeen(userId: string) {
    await this.usersService.update(userId, { has_seen_tutorial: true });
    return { success: true };
  }

  async ssoLogin(sso_id: string, email: string) {
    let user = await this.usersService.findBySsoId(sso_id);
    if (!user) {
      // Create user if not exists
      user = await this.usersService.create({ sso_id, email });
    }
    return this.login(user);
  }

  async googleLogin(token: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: '93727091909-pc7n4v5sefspk8j3qq38f4fsmo1ki2lk.apps.googleusercontent.com',
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.sub || !payload.email) {
        throw new BadRequestException('Invalid Google Token structure');
      }
      return this.ssoLogin(payload.sub, payload.email);
    } catch (e) {
      throw new UnauthorizedException('Invalid Google Token');
    }
  }

  async requestPhoneAdd(userId: string, phone_number: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new BadRequestException('User not found');
    if (user.phone_number) throw new BadRequestException('Phone already exists');

    const otp = this.otpService.generateOtp();
    const expiresAt = this.otpService.getExpiry();
    await this.usersService.update(user.id, { otp_code: otp, otp_expires_at: expiresAt });
    await this.otpService.sendOtp(phone_number, otp, 'phone');
    
    return { message: 'OTP sent to mobile device' };
  }

  async verifyPhoneAdd(userId: string, phone_number: string, code: string) {
    const user = await this.usersService.findById(userId);
    if (!user || user.otp_code !== code || (user.otp_expires_at && user.otp_expires_at < new Date())) {
       throw new BadRequestException('Invalid or expired OTP');
    }

    // Since they verified a mobile phone, they are granted 30 credits!
    const newCredits = user.credits + 30;
    await this.usersService.update(user.id, {
       otp_code: null,
       otp_expires_at: null,
       phone_number,
       is_phone_verified: true,
       credits: newCredits
    });

    const updatedUser = await this.usersService.findById(user.id) as User;
    return this.login(updatedUser); // Return a fresh token to reflect any new payload states if needed
  }
}
