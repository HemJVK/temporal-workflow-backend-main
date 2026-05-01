import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): object {
    return {
      status: 'ok',
      message: 'Agentic Workflow Backend is running',
      temporal: 'http://localhost:8233',
      api_docs: 'http://localhost:3000/api',
    };
  }
}
