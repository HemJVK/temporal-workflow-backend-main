import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
} from 'class-validator';

/**
 * DeployWorkflowDto — the payload sent from the UI when deploying a workflow.
 *
 * The `steps` field is a dynamic Record<nodeId, stepDefinition> whose keys are
 * runtime node IDs (e.g. "start_node", "tool_generic_llm_17..."). NestJS's
 * ValidationPipe with forbidNonWhitelisted:true cannot validate a Record<string, T>
 * via @ValidateNested because it treats the dynamic keys as unknown DTO properties
 * and rejects them. We therefore mark `steps` as @IsObject() only and validate
 * its contents in the service layer.
 */
export class DeployWorkflowDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  workflowId: string;

  @IsString()
  @IsNotEmpty()
  startAt: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  userEmail?: string;

  /**
   * Map of nodeId → step definition. Dynamic keys are allowed here.
   * Validated at the service level (start node check, etc.).
   */
  @IsObject()
  steps: Record<string, any>;
}
