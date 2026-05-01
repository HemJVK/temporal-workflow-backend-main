import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  Optional,
} from '@nestjs/common';
import { AgentsService, ChatMessage } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CreditsGuard } from '../credits/guards/credits.guard';

@UseGuards(AuthGuard)
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  /** Create a new agent */
  @Post()
  create(@Body() dto: CreateAgentDto, @Request() req: any) {
    return this.agentsService.create(dto, req.user.sub);
  }

  /** List all agents */
  @Get()
  findAll(@Request() req: any) {
    return this.agentsService.findAll(req.user.sub);
  }

  /** Get one agent */
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.agentsService.findOne(id, req.user.sub);
  }

  /** Update agent */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAgentDto,
    @Request() req: any,
  ) {
    return this.agentsService.update(id, dto, req.user.sub);
  }

  /** Delete agent */
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.agentsService.remove(id, req.user.sub);
  }

  /**
   * Agent Builder Helper Chat
   * POST /agents/helper-chat
   * Body: { message: string; history: { role, content }[] }
   * Returns: { reply: string; agentConfig?: {...}; remainingCredits?: number }
   *
   * Auth is optional — unauthenticated callers simply don't have credits deducted.
   */
  @Post('helper-chat')
  @UseGuards(CreditsGuard)
  helperChat(
    @Body() body: { message: string; history?: ChatMessage[] },
    @Request() req: any,
  ) {
    const userId: string | undefined = req?.user?.sub;
    return this.agentsService.runHelperChat(
      body.message,
      body.history ?? [],
      userId,
    );
  }
}
