import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { WorkflowHelperService } from 'src/workflow-helper/workflow-helper.service';
import { CreditsService } from 'src/credits/credits.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { CreditsGuard } from 'src/credits/guards/credits.guard';

describe('WorkflowHelperController (e2e)', () => {
  let app: INestApplication;
  
  const mockWorkflow = {
    name: 'Generated Workflow',
    nodes: [{ id: '1', type: 'trigger_start' }],
    edges: [],
  };

  const mockHelperService = {
    processGeneration: jest.fn().mockResolvedValue(mockWorkflow),
    processChat: jest.fn().mockResolvedValue({ reply: 'Hello', workflowData: mockWorkflow }),
  };

  const mockCreditsService = {
    deduct: jest.fn().mockResolvedValue(99),
    getBalance: jest.fn().mockResolvedValue(100),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(WorkflowHelperService)
      .useValue(mockHelperService)
      .overrideProvider(CreditsService)
      .useValue(mockCreditsService)
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(CreditsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api/workflow-helper/generate (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/workflow-helper/generate')
      .send({ description: 'A simple test workflow' })
      .expect((res) => {
        if (res.status !== 201) {
          console.log('GENERATE FAIL:', res.status, res.body);
        }
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.name).toBe('Generated Workflow');
        expect(mockHelperService.processGeneration).toHaveBeenCalled();
      });
  });

  it('/api/workflow-helper/chat (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/workflow-helper/chat')
      .send({ message: 'Hi', history: [] })
      .expect((res) => {
        if (res.status !== 201) {
          console.log('CHAT FAIL:', res.status, res.body);
        }
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.reply).toBe('Hello');
        expect(res.body.workflowData).toBeDefined();
        expect(mockHelperService.processChat).toHaveBeenCalled();
      });
  });
});
