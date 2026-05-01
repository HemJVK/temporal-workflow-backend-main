import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomBlocksService } from './custom-blocks.service';
import { CustomBlocksController } from './custom-blocks.controller';
import { CustomBlock } from './entities/custom-block.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([CustomBlock]), AuthModule],
  controllers: [CustomBlocksController],
  providers: [CustomBlocksService],
})
export class CustomBlocksModule {}
