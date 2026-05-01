import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WorkflowsModule } from './workflows/workflows.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { TemporalModule } from './temporal/temporal.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WorkflowDefinition } from './workflows/entities/workflow-definition.entity';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { AuditModule } from './audit/audit.module';
import { WorkflowRun } from './workflows/entities/workflow-run.entity';
import { CommonModule } from './common/common.module';
import { VoiceModule } from './voice/voice.module';
import { McpModule } from './mcp/mcp.module';
import { McpServer } from './mcp/entities/mcp-server.entity';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { User } from './users/entities/user.entity';
import { AgentsModule } from './agents/agents.module';
import { Agent } from './agents/entities/agent.entity';
import { WorkflowHelperModule } from './workflow-helper/workflow-helper.module';
import { CreditsModule } from './credits/credits.module';
import { CreditTransaction } from './credits/entities/credit-transaction.entity';
import { CustomBlocksModule } from './custom-blocks/custom-blocks.module';
import { CustomBlock } from './custom-blocks/entities/custom-block.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',

      validationSchema: validationSchema,
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 }, // 10 req/sec burst
      { name: 'medium', ttl: 60000, limit: 100 }, // 100 req/min
    ]),
    WorkflowsModule,
    WebhooksModule,
    TemporalModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST') as string,
        port: config.get<number>('DB_PORT') as number,
        username: config.get<string>('DB_USERNAME') as string,
        password: config.get<string>('DB_PASSWORD') as string,
        database: config.get<string>('DB_NAME') as string,
        entities: [
          WorkflowDefinition,
          WorkflowRun,
          McpServer,
          User,
          Agent,
          CreditTransaction,
          CustomBlock,
        ],
        synchronize: true,
      }),
    }),
    AuditModule,
    CommonModule,
    VoiceModule,
    McpModule,
    UsersModule,
    AuthModule,
    AgentsModule,
    WorkflowHelperModule,
    CreditsModule,
    CustomBlocksModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
