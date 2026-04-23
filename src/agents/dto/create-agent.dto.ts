export class CreateAgentDto {
  name: string;
  description?: string;
  systemPrompt?: string;
  modelName?: string;
  tools?: string[];
}
