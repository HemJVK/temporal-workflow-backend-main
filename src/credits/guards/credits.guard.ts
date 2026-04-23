import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { CreditsService, OperationType } from '../credits.service';
import { Reflector } from '@nestjs/core';

@Injectable()
export class CreditsGuard implements CanActivate {
  private readonly logger = new Logger(CreditsGuard.name);

  constructor(
    private readonly creditsService: CreditsService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by AuthGuard

    if (!user || !user.sub) {
      return true; // Bypass for endpoints where auth is optional.
    }

    // You could theoretically use Reflector to see *which* operation type is being run
    // For now, we just ensure they have > 0 credits. The service will handle deductions.
    const balance = await this.creditsService.getBalance(user.sub);

    if (balance <= 0) {
      this.logger.warn(`User ${user.sub} has 0 credits. Blocking request.`);
      throw new ForbiddenException(
        'Insufficient credits to perform this action. Please top up.',
      );
    }

    return true;
  }
}
