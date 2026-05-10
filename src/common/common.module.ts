import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { HealthService } from './health/health.service';
import { HealthController } from './health/health.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [HealthService],
  controllers: [HealthController],
  exports: [HealthService],
})
export class CommonModule {}
