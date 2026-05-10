import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import axios from 'axios';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async checkIntegrations() {
    const results = {
      database: 'down',
      temporal: 'down',
      openRouter: 'down',
      timestamp: new Date().toISOString(),
    };

    // 1. Database Check
    try {
      await this.userRepo.count();
      results.database = 'up';
    } catch (e) {
      this.logger.error('Database health check failed', e);
    }

    // 2. Temporal Check (Ping the address)
    const temporalAddr = this.configService.get<string>('TEMPORAL_ADDRESS') || 'localhost:7233';
    // Note: We can't easily ping a gRPC port with axios, but we can check if it's reachable
    // For now, let's just mark it as 'configured' if address exists
    if (temporalAddr) results.temporal = 'configured';

    // 3. AI Provider Check (OpenRouter)
    const orKey = this.configService.get<string>('OPENROUTER_API_KEY');
    if (orKey) {
      try {
        const res = await axios.get('https://openrouter.ai/api/v1/models', {
          headers: { Authorization: `Bearer ${orKey}` },
          timeout: 5000,
        });
        if (res.status === 200) results.openRouter = 'up';
      } catch (e) {
        this.logger.error('OpenRouter health check failed', e);
      }
    }

    return results;
  }
}
