import {
  Controller,
  Post,
  Body,
  Request,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreditsService } from '../credits/credits.service';
import { CreditsGuard } from '../credits/guards/credits.guard';

// ── System Prompts ────────────────────────────────────────────────────────────

const WORKFLOW_HELPER_PROMPT = `You are an expert workflow designer for a Temporal-based workflow engine.

The user will describe a workflow they want to build. Your job is to convert their description into a React Flow workflow JSON.

Available node types and their uses:
- trigger_start: Start trigger (always first) — config: { triggerType: "Webhook" }
- trigger_schedule: Cron schedule trigger — config: { cron: "0 9 * * 1-5" }
- make_http_call: HTTP requests — config: { method: "GET", url: "...", headers: "{}" }
- tool_generic_llm: LLM processing — config: { systemPrompt: "...", userPrompt: "{{input}}" }
- logic_condition: Conditional branching — config: { condition: "{{var}} == value" }
- logic_wait: Delay/wait — config: { duration: "5s" }
- logic_loop: Loop over items — config: { items: "{{data}}" }
- logic_parallel: Run steps in parallel
- tool_gmail: Send Gmail — config: { to: "...", subject: "...", body: "..." }
- send_sms_twilio: Send SMS via Twilio — config: { to: "{{phone}}", message: "..." }
- send_email_sendgrid: Send email via SendGrid — config: { to: "...", subject: "...", body: "..." }
- query_db_postgres: DB query — config: { query: "SELECT ...", params: [] }
- ai_agent: AI agent node — config: { systemPrompt: "...", userPrompt: "{{input}}", agentId: "" }
- tool_transform: Transform/map data — config: { expression: "{{data.items}}" }
- trigger_end: End node (always last)

RULES:
1. Always start with trigger_start (or trigger_schedule) and end with trigger_end
2. Position nodes: start at x:400,y:100, space 200px vertically
3. Create edges connecting all nodes sequentially
4. Return ONLY valid JSON, no markdown, no extra text
5. Use meaningful IDs (e.g. "fetch_data") and ALWAYS provide a highly descriptive, human-readable "label" in the data object (e.g., "News Agent", "Draft Generator"). Do NOT set sourceHandle or targetHandle on standard edges.

Output format (strict JSON):
{
  "nodes": [
    { "id": "start_node", "type": "trigger_start", "position": {"x": 400, "y": 100}, "data": { "label": "Webhook Trigger", "type": "trigger_start", "config": { "triggerType": "Webhook" }, "status": "idle" } }
  ],
  "edges": [
    { "id": "e1-2", "source": "start_node", "target": "node2", "animated": true, "style": { "stroke": "#9333ea", "strokeWidth": 2 } }
  ],
  "name": "Descriptive Workflow Name"
}`;

const WORKFLOW_CHAT_PROMPT = `You are an expert AI workflow architect. Help the user design complex workflows step-by-step.

Your capabilities:
1. Ask clarifying questions to understand the workflow requirements
2. Suggest the best node types and flow design
3. Generate a complete workflow JSON when the user is ready
4. Refine existing workflows based on feedback

When the user describes a workflow idea:
- Ask 1-2 clarifying questions to understand triggers, data sources, and outputs
- Propose the workflow design in plain English first
- Once confirmed, generate the workflow JSON

When generating the final workflow JSON, wrap it in:
\`\`\`workflow-json
{ ... the full JSON object ... }
\`\`\`

CRITICAL RULES FOR WORKFLOW-JSON:
1. Every single node MUST have a highly descriptive "label" inside the "data" object (e.g. "News Web Agent", "Slack Approval").
2. Do NOT specify "sourceHandle" or "targetHandle" inside edges unless you literally are routing from a logic_router block.
3. For ai_agent nodes, provide an appropriate agentName and systemPrompt in the config data so the Agent Builder can construct it.

Available node types: trigger_start, trigger_schedule, make_http_call, tool_generic_llm, 
logic_condition, logic_wait, logic_loop, logic_parallel, tool_gmail, send_sms_twilio, 
send_email_sendgrid, query_db_postgres, ai_agent, tool_transform, trigger_end

Keep responses concise. Ask ONE question at a time.`;

// ── Controller ────────────────────────────────────────────────────────────────

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

@Controller('workflow-helper')
@UseGuards(CreditsGuard)
export class WorkflowHelperController {
  constructor(
    private readonly configService: ConfigService,
    private readonly creditsService: CreditsService,
  ) {}

  // ── One-shot generation ────────────────────────────────────────────────────

  @Post('generate')
  async generate(
    @Body() body: { description: string },
    @Request() req: any,
  ) {
    if (!body.description?.trim()) {
      throw new BadRequestException('description is required');
    }

    const userId: string | undefined = req?.user?.sub;
    if (userId) {
      // One-shot generation should be cheap; treat it like a helper action.
      await this.creditsService.deduct(userId, 'HELPER_CHAT');
    }

    const openRouterKey = this.configService.get<string>('OPENROUTER_API_KEY');

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openRouterKey}`,
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'Agent Flow Workflow Helper',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-lite-001',
          messages: [
            { role: 'system', content: WORKFLOW_HELPER_PROMPT },
            {
              role: 'user',
              content: `Generate a workflow for: ${body.description}`,
            },
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenRouter error: ${response.status} — ${err}`);
    }

    const data = (await response.json()) as any;
    const raw: string = data.choices?.[0]?.message?.content ?? '{}';

    try {
      return JSON.parse(raw);
    } catch {
      return { error: 'Failed to parse workflow JSON', raw };
    }
  }

  // ── Multi-turn workflow chat ────────────────────────────────────────────────

  @Post('chat')
  async chat(
    @Body() body: { message: string; history?: ChatMsg[] },
    @Request() req: any,
  ) {
    if (!body.message?.trim()) {
      throw new BadRequestException('message is required');
    }

    const userId: string | undefined = req?.user?.sub;
    let remainingCredits: number | undefined;
    if (userId) {
      remainingCredits = await this.creditsService.deduct(userId, 'HELPER_CHAT');
    }

    const openRouterKey = this.configService.get<string>('OPENROUTER_API_KEY');
    const history: ChatMsg[] = body.history ?? [];

    const messages = [
      { role: 'system', content: WORKFLOW_CHAT_PROMPT },
      ...history,
      { role: 'user', content: body.message },
    ];

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openRouterKey}`,
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'Agent Flow Workflow Chat',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-lite-001',
          messages,
          temperature: 0.5,
        }),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenRouter error: ${response.status} — ${err}`);
    }

    const data = (await response.json()) as any;
    const reply: string = data.choices?.[0]?.message?.content ?? '';

    // Try to extract embedded workflow JSON
    let workflowData: Record<string, unknown> | undefined;
    const jsonMatch = reply.match(/```workflow-json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        workflowData = JSON.parse(jsonMatch[1]);
      } catch {
        // Not valid JSON
      }
    }

    return { reply, workflowData, remainingCredits };
  }
}
