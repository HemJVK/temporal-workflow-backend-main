import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      validationSchema: validationSchema,
    }),
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
        entities: [WorkflowDefinition, WorkflowRun, McpServer],
        synchronize: true,
      }),
    }),
    AuditModule,
    CommonModule,
    VoiceModule,
    McpModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
