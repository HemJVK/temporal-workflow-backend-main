import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Agent } from './entities/agent.entity';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { CreditsService } from '../credits/credits.service';

// ── Agent Creator system prompt ──────────────────────────────────────────────
// Inspired by Omni PR #77: when create_helper_chat=true, prepend this prompt
// so the model asks clarifying questions before drafting a final system prompt.
const AGENT_CREATOR_SESSION_PROMPT = `You are an expert AI Agent Architect. Your job is to help the user design a perfect system prompt for their AI agent.

You MUST follow this conversational flow:
1. First, greet the user and ask: "What is the main purpose of this agent? (e.g., customer support, data analysis, code review)"
2. Based on their answer, ask 2-3 clarifying follow-up questions to understand:
   - Target users / audience
   - Tone & personality (formal, friendly, technical?)
   - Key capabilities or restrictions
   - Any specific domain knowledge needed
3. Once you have enough context (after at least 2 user messages), draft a comprehensive system prompt.
4. Present the drafted system prompt clearly, then ask: "Would you like any changes?"
5. If the user asks for changes, revise the prompt accordingly.
6. When the user is satisfied, respond with a JSON block containing the final agent config:

\`\`\`json
{
  "name": "Agent Name",
  "description": "Short description",
  "systemPrompt": "Full system prompt text...",
  "modelName": "gpt-4o",
  "tools": []
}
\`\`\`

Keep your responses concise and conversational. Ask ONE question at a time.`;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    private readonly configService: ConfigService,
    private readonly creditsService: CreditsService,
  ) {}

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async create(dto: CreateAgentDto): Promise<Agent> {
    const agent = this.agentRepo.create({
      name: dto.name,
      description: dto.description ?? '',
      systemPrompt: dto.systemPrompt ?? '',
      modelName: dto.modelName ?? 'nvidia/nemotron-3-super-120b-a12b:free',
      tools: dto.tools ?? [],
    });
    return this.agentRepo.save(agent);
  }

  findAll(): Promise<Agent[]> {
    return this.agentRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Agent> {
    const agent = await this.agentRepo.findOne({ where: { id } });
    if (!agent) throw new NotFoundException(`Agent ${id} not found`);
    return agent;
  }

  async update(id: string, dto: UpdateAgentDto): Promise<Agent> {
    await this.findOne(id); // throws if not found
    await this.agentRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<{ success: boolean }> {
    await this.findOne(id);
    await this.agentRepo.delete(id);
    return { success: true };
  }

  // ── Agent Helper Chat ────────────────────────────────────────────────────────

  async runHelperChat(
    message: string,
    history: ChatMessage[] = [],
    userId?: string,
  ): Promise<{ reply: string; agentConfig?: Record<string, unknown>; remainingCredits?: number }> {
    // Deduct 1 credit per helper-chat message if user is authenticated
    let remainingCredits: number | undefined;
    if (userId) {
      remainingCredits = await this.creditsService.deduct(userId, 'HELPER_CHAT');
    }

    const openRouterKey = this.configService.get<string>('OPENROUTER_API_KEY');

    // Build messages array for the API call
    const messages = [
      { role: 'system', content: AGENT_CREATOR_SESSION_PROMPT },
      ...history,
      { role: 'user', content: message },
    ];

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openRouterKey}`,
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'Temporal Workflow Agent Builder',
        },
        body: JSON.stringify({
          model: 'nvidia/nemotron-3-super-120b-a12b:free',
          messages,
          temperature: 0.7,
        }),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenRouter error: ${response.status} — ${err}`);
    }

    const data = (await response.json()) as any;
    const reply = data.choices?.[0]?.message?.content ?? '';

    // Try to extract agent config JSON block from the reply
    let agentConfig: Record<string, unknown> | undefined;
    const jsonMatch = reply.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        agentConfig = JSON.parse(jsonMatch[1]);
      } catch {
        // Not valid JSON, that's fine
      }
    }

    return { reply, agentConfig, remainingCredits };
  }
}
