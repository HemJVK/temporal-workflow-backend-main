import { Controller, Get, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit.entity';

@Controller('audit')
export class AuditController {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  // Get logs for a specific RUN of a workflow
  // Called by UI: /audit/logs?runId=123-abc
  @Get('logs')
  async getLogs(@Query('runId') runId: string) {
    if (!runId) return [];

    return this.auditRepo.find({
      where: { workflowRunId: runId },
      order: { timestamp: 'ASC' }, // Show timeline in order
    });
  }
}
