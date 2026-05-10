import { Module } from '@nestjs/common';
import { WorkflowHelperController } from './workflow-helper.controller';
import { WorkflowHelperService } from './workflow-helper.service';
import { CreditsModule } from '../credits/credits.module';

@Module({
  imports: [CreditsModule],
  controllers: [WorkflowHelperController],
  providers: [WorkflowHelperService],
})
export class WorkflowHelperModule {}
