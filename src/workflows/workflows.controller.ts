import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  // 👇 Import specific exceptions
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { DeployWorkflowDto } from './dto/deploy-workflow.dto';
import { CreateWorkflowDto } from './dto/create-workflow.dto';

@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  /**
   * 1. CREATE
   */
  @Post()
  async create(@Body() createWorkflowDto: CreateWorkflowDto) {
    return this.workflowsService.createWorkflow(createWorkflowDto);
  }

  /**
   * 2. LIST
   */
  @Get()
  async findAll() {
    return this.workflowsService.findAll();
  }

  /**
   * 3. GET ONE
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const workflow = await this.workflowsService.findOne(id);
    if (!workflow) {
      // ✅ Use semantic exception
      throw new NotFoundException(`Workflow ${id} not found`);
    }
    return workflow;
  }

  /**
   * 4. UPDATE DRAFT
   */
  @Patch(':id')
  async updateDraft(
    @Param('id') id: string,
    @Body() body: { nodes: any[]; edges: any[] },
  ) {
    return await this.workflowsService.updateDraft(id, body.nodes, body.edges);
  }

  /**
   * 5. DEPLOY
   */
  @Post('deploy')
  async deploy(@Body() deployWorkflowDto: DeployWorkflowDto) {
    try {
      return await this.workflowsService.deployWorkflow(deployWorkflowDto);
    } catch (e) {
      // Service might throw "No Start Node found" (ValidationError).
      // We catch generic Errors and rethrow as BadRequest so client gets 400, not 500.
      if (e instanceof NotFoundException) throw e;
      throw new BadRequestException('Validation Error');
    }
  }

  /**
   * 6. STATUS
   */
  @Get(':id/status')
  async getStatus(@Param('id') id: string, @Query('runId') runId?: string) {
    try {
      return await this.workflowsService.getWorkflowStatus(id, runId);
    } catch (e) {
      console.log(e);
      throw new NotFoundException('Execution not found');
    }
  }
}
