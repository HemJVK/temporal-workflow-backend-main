import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhooksService } from './webhooks.service';
import { WorkflowRun } from 'src/workflows/entities/workflow-run.entity';
import { WorkflowDefinition } from 'src/workflows/entities/workflow-definition.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WorkflowRun, WorkflowDefinition])],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
