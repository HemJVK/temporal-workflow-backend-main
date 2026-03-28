import { Controller, Post, Body, UnauthorizedException, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { AuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService
  ) {}

  @Post('login')
  async login(@Body() body: any) {
    if (!body.email || !body.password) {
      throw new UnauthorizedException('Please provide email and password');
    }
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('register')
  async register(@Body() body: any) {
    return this.authService.register({
      email: body.email,
      password: body.password,
      phone_number: body.phone_number,
      sso_id: body.sso_id,
    });
  }

  @Post('verify-otp')
  async verifyOtp(@Body() body: any) {
    if (!body.userId || !body.code) {
      throw new UnauthorizedException('UserId and code are required');
    }
    return this.authService.verifyOtp(body.userId, body.code);
  }

  @Post('sso')
  async sso(@Body() body: any) {
    if (!body.sso_id) {
       throw new UnauthorizedException('SSO ID required');
    }
    return this.authService.ssoLogin(body.sso_id, body.email);
  }

  @UseGuards(AuthGuard)
  @Post('tutorial-seen')
  async markTutorialSeen(@Request() req: any) {
    return this.authService.markTutorialSeen(req.user.sub as string);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async getProfile(@Request() req: any) {
    const user = await this.usersService.findById(req.user.sub as string);
    if (!user) throw new UnauthorizedException();
    // omit password
    const { password_hash, ...result } = user;
    return result;
  }
}
