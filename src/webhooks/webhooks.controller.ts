import { Controller, Post, Param, Body, Headers, Query } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import type { IncomingHttpHeaders } from 'http';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post(':workflowId')
  async triggerWebhook(
    @Param('workflowId') workflowId: string,

    // Type: A generic JSON object
    @Body() body: Record<string, any>,

    // Type: Standard HTTP Headers (string | string[])
    @Headers() headers: IncomingHttpHeaders,

    // Type: Query params are typically key-value strings
    @Query() query: Record<string, string>,
  ) {
    return this.webhooksService.triggerWebhook(workflowId, {
      body,
      headers,
      query,
    });
  }
}
