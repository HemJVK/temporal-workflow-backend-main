import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowHelperService } from './workflow-helper.service';
import { ConfigService } from '@nestjs/config';

describe('WorkflowHelperService', () => {
  let service: WorkflowHelperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowHelperService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('dummy_key'),
          },
        },
      ],
    }).compile();

    service = module.get<WorkflowHelperService>(WorkflowHelperService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('assembleWorkflowFromToolCalls', () => {
    it('should correctly assemble nodes and edges from tool calls', () => {
      const toolCalls = [
        {
          function: {
            name: 'add_node',
            arguments: JSON.stringify({ id: 'node1', type: 'trigger_start', label: 'Start' }),
          },
        },
        {
          function: {
            name: 'add_node',
            arguments: JSON.stringify({ id: 'node2', type: 'trigger_end', label: 'End' }),
          },
        },
        {
          function: {
            name: 'connect_nodes',
            arguments: JSON.stringify({ source: 'node1', target: 'node2' }),
          },
        },
        {
          function: {
            name: 'set_workflow_metadata',
            arguments: JSON.stringify({ name: 'Test Workflow' }),
          },
        },
      ];

      const result = (service as any).assembleWorkflowFromToolCalls(toolCalls);

      expect(result.name).toBe('Test Workflow');
      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
      expect(result.nodes[0].id).toBe('node1');
      expect(result.nodes[1].id).toBe('node2');
      expect(result.edges[0].source).toBe('node1');
      expect(result.edges[0].target).toBe('node2');
    });

    it('should correctly handle chain_sequential_nodes', () => {
      const toolCalls = [
        {
          function: {
            name: 'add_node',
            arguments: JSON.stringify({ id: 'n1', type: 'trigger_start', label: '1' }),
          },
        },
        {
          function: {
            name: 'add_node',
            arguments: JSON.stringify({ id: 'n2', type: 'tool_generic_llm', label: '2' }),
          },
        },
        {
          function: {
            name: 'add_node',
            arguments: JSON.stringify({ id: 'n3', type: 'trigger_end', label: '3' }),
          },
        },
        {
          function: {
            name: 'chain_sequential_nodes',
            arguments: JSON.stringify({ nodeIds: ['n1', 'n2', 'n3'] }),
          },
        },
      ];

      const result = (service as any).assembleWorkflowFromToolCalls(toolCalls);

      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);
      expect(result.edges[0].source).toBe('n1');
      expect(result.edges[0].target).toBe('n2');
      expect(result.edges[1].source).toBe('n2');
      expect(result.edges[1].target).toBe('n3');
    });
  });
});
