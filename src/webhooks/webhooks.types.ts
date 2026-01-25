import { IncomingHttpHeaders } from 'http';

export interface WebhookContext {
  /** The JSON body of the request */
  body: Record<string, any>;

  /** Standard Node.js HTTP Headers */
  headers: IncomingHttpHeaders;

  /** URL Query parameters (always strings) */
  query: Record<string, string>;
}
