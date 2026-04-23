import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { OtpService } from '../auth/otp.service';
import { CreditTransaction } from './entities/credit-transaction.entity';

/** Costs per operation type (in credits) */
export const CREDIT_COSTS = {
  WORKFLOW_RUN: 5,
  AGENT_RUN: 3,
  HELPER_CHAT: 1,
} as const;

export type OperationType = keyof typeof CREDIT_COSTS;

/** How many credits trigger a low-balance warning SMS */
const LOW_CREDIT_THRESHOLD = 10;

@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(CreditTransaction)
    private readonly transactionRepo: Repository<CreditTransaction>,
    private readonly otpService: OtpService,
    private readonly configService: ConfigService,
  ) {}

  async getBalance(userId: string): Promise<number> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user.credits;
  }

  /**
   * Deduct credits for an operation.
   * Throws BadRequestException if balance insufficient.
   * Sends Twilio SMS when balance drops below LOW_CREDIT_THRESHOLD.
   */
  async deduct(userId: string, operation: OperationType): Promise<number> {
    const cost = CREDIT_COSTS[operation];
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.credits < cost) {
      throw new BadRequestException(
        `Insufficient credits. Need ${cost}, have ${user.credits}. Please top up.`,
      );
    }

    const newBalance = user.credits - cost;
    await this.userRepo.update(userId, { credits: newBalance });
    
    await this.transactionRepo.save({
      user,
      amount: -cost,
      reason: operation,
    });
    
    this.logger.log(`User ${userId}: -${cost} credits (${operation}). Balance: ${newBalance}`);

    // Send low-credit notification if threshold crossed
    if (user.credits >= LOW_CREDIT_THRESHOLD && newBalance < LOW_CREDIT_THRESHOLD) {
      this.sendLowCreditAlert(user, newBalance).catch((err) =>
        this.logger.error('Low credit alert failed', err),
      );
    }

    return newBalance;
  }

  /**
   * Add credits to a user (top-up / purchase).
   */
  async topUp(userId: string, amount: number): Promise<number> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const newBalance = user.credits + amount;
    await this.userRepo.update(userId, { credits: newBalance });

    await this.transactionRepo.save({
      user,
      amount: amount,
      reason: 'top-up',
    });

    this.logger.log(`User ${userId}: +${amount} credits (top-up). Balance: ${newBalance}`);
    return newBalance;
  }

  /**
   * Admin: grant credits without payment (e.g. promotions, referrals).
   */
  async grant(userId: string, amount: number, reason = 'admin grant'): Promise<number> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const newBalance = user.credits + amount;
    await this.userRepo.update(userId, { credits: newBalance });

    await this.transactionRepo.save({
      user,
      amount: amount,
      reason: reason,
    });

    this.logger.log(`User ${userId}: +${amount} credits (${reason}). Balance: ${newBalance}`);
    return newBalance;
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  private async sendLowCreditAlert(user: User, balance: number): Promise<void> {
    const appName = this.configService.get<string>('APP_NAME') || 'Agent Flow';
    const msg =
      `⚠️ ${appName}: Your credit balance is low (${balance} credits remaining). ` +
      `Top up now to keep your workflows running: ${this.configService.get('APP_URL') || 'http://localhost:5173'}`;

    if (user.phone_number && user.is_phone_verified) {
      await this.otpService.sendSms(user.phone_number, msg);
      this.logger.log(`Low credit SMS sent to user ${user.id}`);
    } else if (user.email) {
      this.logger.log(`[LOW CREDIT EMAIL] To: ${user.email} | ${msg}`);
    }
  }
}
