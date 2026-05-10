import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    type: string;
    config: any;
    status: string;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  animated: boolean;
  style: { stroke: string; strokeWidth: number };
}

@Injectable()
export class WorkflowHelperService {
  constructor(private readonly configService: ConfigService) {}

  private readonly AVAILABLE_NODES = [
    'trigger_start',
    'trigger_schedule',
    'make_http_call',
    'tool_generic_llm',
    'logic_condition',
    'logic_wait',
    'logic_loop',
    'logic_parallel',
    'logic_custom_block',
    'query_db_postgres',
    'ai_agent',
    'tool_transform',
    'trigger_end',
  ];

  getToolDefinitions() {
    return [
      {
        type: 'function',
        function: {
          name: 'add_node',
          description: 'Adds a new block/node to the workflow canvas.',
          parameters: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'A unique slug for the node (e.g. "fetch_data")' },
              type: { 
                type: 'string', 
                enum: this.AVAILABLE_NODES,
                description: 'The architectural type of the block' 
              },
              label: { type: 'string', description: 'A human-readable descriptive name (e.g. "Email Parser")' },
              config: { 
                type: 'object', 
                description: 'Configuration parameters for the block based on its type' 
              },
            },
            required: ['id', 'type', 'label'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'connect_nodes',
          description: 'Creates a directed edge between two existing nodes.',
          parameters: {
            type: 'object',
            properties: {
              source: { type: 'string', description: 'The ID of the source node' },
              target: { type: 'string', description: 'The ID of the target node' },
            },
            required: ['source', 'target'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'chain_sequential_nodes',
          description: 'Connects a list of node IDs in a sequential linear chain.',
          parameters: {
            type: 'object',
            properties: {
              nodeIds: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'The IDs of the nodes in order (e.g. ["start", "step1", "end"])'
              },
            },
            required: ['nodeIds'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'set_workflow_metadata',
          description: 'Sets the overall workflow name and description.',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
            required: ['name'],
          },
        },
      },
    ];
  }

  async processGeneration(description: string, model?: string) {
    const openRouterKey = this.configService.get<string>('OPENROUTER_API_KEY');
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openRouterKey}`,
        'X-Title': 'Agent Flow Helper',
      },
      body: JSON.stringify({
        model: model || 'google/gemini-2.0-flash-001',
        messages: [
          { 
            role: 'system', 
            content: `You are a workflow architect. Use the provided tools to build a workflow based on the user's requirements. 
            Rules:
            1. Always start with a trigger node.
            2. Connect nodes logically using connect_nodes or chain_sequential_nodes.
            3. CRITICAL: For every node you add, provide a detailed 'config' object. 
               - For 'tool_generic_llm' or 'ai_agent', provide 'userPrompt' AND 'bindTools' (an array of tool names it should have access to, e.g. ["Postgres DB", "Gmail"]).
               - For 'logic_condition', provide 'rules' array.
               - For 'make_http_call', provide 'url' and 'method'.
            4. COMPLETTION: Every workflow MUST end with a 'trigger_end' node.
            5. Use descriptive labels for all blocks.
            6. Layout: Place nodes sequentially from top to bottom (y increases by 150 each step).` 
          },
          { role: 'user', content: description },
        ],
        tools: this.getToolDefinitions(),
        tool_choice: 'auto',
      }),
    });

    if (!response.ok) throw new Error(`OpenRouter error: ${await response.text()}`);

    const data = await response.json();
    const toolCalls = data.choices[0].message.tool_calls;

    return this.assembleWorkflowFromToolCalls(toolCalls);
  }

  async processChat(message: string, history: any[], model?: string) {
    const openRouterKey = this.configService.get<string>('OPENROUTER_API_KEY');
    
    const messages = [
      { role: 'system', content: `You are an AI workflow architect. Use the provided tools to generate workflow JSON when the user is ready. 
      Otherwise, chat with the user to clarify their needs. 
      When you generate a workflow, use the tools provided.
      CRITICAL: For every node you add, provide a detailed 'config' object (userPrompt, bindTools, logic rules, URLs, etc.) based on the node type.
      COMPLETION: Every workflow MUST end with a 'trigger_end' node.
      ALWAYS ask for confirmation before generating a large workflow.` },
      ...history,
      { role: 'user', content: message },
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openRouterKey}`,
        'X-Title': 'Agent Flow Chat',
      },
      body: JSON.stringify({
        model: model || 'google/gemini-2.0-flash-001',
        messages,
        tools: this.getToolDefinitions(),
        tool_choice: 'auto',
      }),
    });

    if (!response.ok) throw new Error(`OpenRouter error: ${await response.text()}`);

    const data = await response.json();
    const messageObj = data.choices[0].message;
    const toolCalls = messageObj.tool_calls;

    let workflowData: any = null;
    let reply: string = messageObj.content || '';

    if (toolCalls && toolCalls.length > 0) {
      workflowData = this.assembleWorkflowFromToolCalls(toolCalls);
      // When the LLM only returns tool calls (content is null/empty), synthesise a reply
      if (!reply) {
        const nodeCount = workflowData?.nodes?.length ?? 0;
        const wfName = workflowData?.name || 'workflow';
        reply = `✅ I've generated **"${wfName}"** with ${nodeCount} node(s) and loaded it onto your canvas. Let me know if you'd like any adjustments!`;
      }
    }

    // Final safety fallback
    if (!reply) {
      reply = "I've processed your request. Let me know how you'd like to proceed!";
    }

    return { reply, workflowData };
  }

  private assembleWorkflowFromToolCalls(toolCalls: any[]) {
    const nodes: WorkflowNode[] = [];
    const edges: WorkflowEdge[] = [];
    let name = 'Generated Workflow';
    let currentY = 100;

    if (!toolCalls) return { nodes, edges, name };

    for (const call of toolCalls) {
      const args = JSON.parse(call.function.arguments);

      if (call.function.name === 'add_node') {
        nodes.push({
          id: args.id,
          type: args.type,
          position: { x: 400, y: currentY },
          data: {
            label: args.label,
            type: args.type,
            config: args.config || {},
            status: 'idle',
          },
        });
        currentY += 150;
      } else if (call.function.name === 'connect_nodes') {
        edges.push({
          id: `e-${args.source}-${args.target}`,
          source: args.source,
          target: args.target,
          animated: true,
          style: { stroke: '#9333ea', strokeWidth: 2 },
        });
      } else if (call.function.name === 'chain_sequential_nodes') {
        const ids = args.nodeIds;
        for (let i = 0; i < ids.length - 1; i++) {
          edges.push({
            id: `e-${ids[i]}-${ids[i + 1]}`,
            source: ids[i],
            target: ids[i + 1],
            animated: true,
            style: { stroke: '#9333ea', strokeWidth: 2 },
          });
        }
      } else if (call.function.name === 'set_workflow_metadata') {
        name = args.name;
      }
    }

    return { nodes, edges, name };
  }
}
