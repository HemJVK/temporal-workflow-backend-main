import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CustomBlocksService } from './custom-blocks.service';
import {
  CreateCustomBlockDto,
  UpdateCustomBlockDto,
} from './dto/create-custom-block.dto';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('custom-blocks')
export class CustomBlocksController {
  constructor(private readonly customBlocksService: CustomBlocksService) {}

  @Post()
  create(
    @Body() createCustomBlockDto: CreateCustomBlockDto,
    @Request() req: any,
  ) {
    return this.customBlocksService.create(createCustomBlockDto, req.user.sub);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.customBlocksService.findAll(req.user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.customBlocksService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCustomBlockDto: UpdateCustomBlockDto,
    @Request() req: any,
  ) {
    return this.customBlocksService.update(
      id,
      updateCustomBlockDto,
      req.user.sub,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.customBlocksService.remove(id, req.user.sub);
  }
}
