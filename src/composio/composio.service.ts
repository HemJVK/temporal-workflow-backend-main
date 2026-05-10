import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

const COMPOSIO_BASE = 'https://backend.composio.tools/api/v1';

@Injectable()
export class ComposioService {
  private readonly logger = new Logger(ComposioService.name);

  constructor(private readonly configService: ConfigService) {}

  private get apiKey(): string {
    return this.configService.get<string>('COMPOSIO_API_KEY') || '';
  }

  private get headers() {
    return {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Registers a new Composio entity for the given user email.
   * Safe to call on every signup — Composio is idempotent (re-registering the same entityId is a no-op).
   */
  async registerEntity(email: string): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn('[Composio] COMPOSIO_API_KEY not set — skipping entity registration.');
      return;
    }
    try {
      await axios.post(
        `${COMPOSIO_BASE}/client/auth/client_info/create_user`,
        { entityId: email },
        { headers: this.headers },
      );
      this.logger.log(`[Composio] Entity registered: ${email}`);
    } catch (err: any) {
      // 409 = already exists — treat as success
      if (err?.response?.status === 409) {
        this.logger.debug(`[Composio] Entity already exists: ${email}`);
        return;
      }
      this.logger.error(`[Composio] Failed to register entity for ${email}`, err?.response?.data || err.message);
      // Non-fatal: don't block user signup
    }
  }

  /**
   * Returns the OAuth URL the user must visit to connect their Gmail account.
   * After visiting the URL and authorizing, Composio stores the token and
   * routes all tool calls with COMPOSIO_ENTITY_ID=email through that account.
   */
  async getGmailConnectionUrl(email: string, redirectUrl?: string): Promise<string | null> {
    if (!this.apiKey) return null;
    try {
      const params: Record<string, string> = {
        entityId: email,
        appName: 'gmail',
      };
      if (redirectUrl) params['redirectUrl'] = redirectUrl;

      const response = await axios.get(
        `${COMPOSIO_BASE}/client/auth/client_info/integration/url`,
        { headers: this.headers, params },
      );
      return response.data?.redirectUrl || null;
    } catch (err: any) {
      this.logger.error(`[Composio] Failed to get Gmail connection URL for ${email}`, err?.response?.data || err.message);
      return null;
    }
  }

  /**
   * Checks whether the user has connected their Gmail account to Composio.
   */
  async isGmailConnected(email: string): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const response = await axios.get(
        `${COMPOSIO_BASE}/connectedAccounts`,
        {
          headers: this.headers,
          params: { entityId: email, appName: 'gmail', status: 'ACTIVE' },
        },
      );
      const items: any[] = response.data?.items || [];
      return items.length > 0;
    } catch (err: any) {
      this.logger.warn(`[Composio] Could not check Gmail status for ${email}`, err?.response?.data || err.message);
      return false;
    }
  }
}
