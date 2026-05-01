import { AppNode, WorkflowEdge } from '../workflow.types';

export class CreateWorkflowDto {
  name: string;
  nodes: AppNode[];
  edges: WorkflowEdge[];
  isPackage?: boolean;
  packageInputs?: any;
  packageOutputs?: any;
}
