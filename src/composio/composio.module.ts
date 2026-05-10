import { Module } from '@nestjs/common';
import { ComposioService } from './composio.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [ComposioService],
  exports: [ComposioService],
})
export class ComposioModule {}
