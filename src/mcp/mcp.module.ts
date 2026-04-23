import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { McpService } from './mcp.service';
import { McpController } from './mcp.controller';
import { McpServer } from './entities/mcp-server.entity';

@Module({
    imports: [TypeOrmModule.forFeature([McpServer]), ConfigModule],
    controllers: [McpController],
    providers: [McpService],
    exports: [McpService],
})
export class McpModule { }
