export class CreateCustomBlockDto {
  name: string;
  description: string;
  inputs?: string[];
  customLogic?: string;
  isPublic?: boolean;
}

export class UpdateCustomBlockDto {
  name?: string;
  description?: string;
  inputs?: string[];
  customLogic?: string;
  isPublic?: boolean;
}
