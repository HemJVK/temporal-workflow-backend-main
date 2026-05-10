import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsBoolean,
  IsOptional,
  IsObject,
} from 'class-validator';
import { AppNode, WorkflowEdge } from '../workflow.types';

export class CreateWorkflowDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  nodes: AppNode[];

  @IsArray()
  edges: WorkflowEdge[];

  @IsBoolean()
  @IsOptional()
  isPackage?: boolean;

  @IsObject()
  @IsOptional()
  packageInputs?: any;

  @IsObject()
  @IsOptional()
  packageOutputs?: any;
}
