import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { CreditsService, CREDIT_COSTS } from './credits.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('credits')
@UseGuards(AuthGuard)
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  /** GET /credits/balance — get current user's balance */
  @Get('balance')
  async getBalance(@Request() req: any) {
    const balance = await this.creditsService.getBalance(req.user.sub as string);
    return { balance };
  }

  /**
   * POST /credits/top-up
   * Body: { amount: number, paymentReference?: string }
   *
   * In a real production app you would verify a Stripe/Razorpay payment
   * reference here before granting credits. For now, we trust the call.
   */
  @Post('top-up')
  async topUp(
    @Request() req: any,
    @Body() body: { amount: number; paymentReference?: string },
  ) {
    if (!body.amount || body.amount <= 0) {
      throw new BadRequestException('amount must be a positive number');
    }
    const newBalance = await this.creditsService.topUp(
      req.user.sub as string,
      Number(body.amount),
    );
    return { success: true, newBalance };
  }

  /** GET /credits/costs — return the cost table so the UI can display it */
  @Get('costs')
  getCosts() {
    return CREDIT_COSTS;
  }
}
