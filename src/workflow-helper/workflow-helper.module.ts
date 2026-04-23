import { Module } from '@nestjs/common';
import { WorkflowHelperController } from './workflow-helper.controller';
import { CreditsModule } from '../credits/credits.module';

@Module({
  imports: [CreditsModule],
  controllers: [WorkflowHelperController],
})
export class WorkflowHelperModule {}
