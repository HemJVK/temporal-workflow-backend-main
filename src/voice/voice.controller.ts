import { Controller, Post, Body } from '@nestjs/common';
import { Client } from '@temporalio/client';
import { Inject } from '@nestjs/common';

@Controller('voice')
export class VoiceController {
  constructor(@Inject('TEMPORAL_CLIENT') private readonly client: Client) {}

  @Post('/callback')
  async handleVoiceResult(@Body() body: any) {
    // 1. Extract Metadata passed during initiation
    // (Provider sends this back to us)
    const { workflowId, runId, nodeId } = body.metadata;
    const analysis = body.analysis; // e.g. { budget: "$5k", booking_confirmed: true }

    console.log(`[Callback] Received data for ${workflowId} run ${runId}`);

    // 2. Signal the Waiting Workflow
    const handle = this.client.workflow.getHandle(workflowId, runId);

    await handle.signal('VOICE_CALLBACK', {
      nodeId: nodeId,
      data: analysis,
    });

    return { received: true };
  }
}
