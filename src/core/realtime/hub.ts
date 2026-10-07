import { HubConnectionBuilder, HubConnectionState, LogLevel, type HubConnection, type ILogger } from '@microsoft/signalr';

import type { ServiceId } from '@/core/api/ApiError';
import { apiFor } from '@/core/api/clients';
import { tokenStore } from '@/core/session/tokenStore';

export type ReceiveNotificationPayload = {
  title?: string | null;
  content?: string | null;
  // The room service adds these for booking notifications.
  bookingId?: string | null;
  groupId?: string | null;
  roomId?: string | null;
  code?: string | null;
};

export type ResourceUpdatedPayload = { resourceType?: number | null; resourceId?: string | null; title?: string | null };

export type HubHandlers = {
  onNotification: (service: ServiceId, payload: ReceiveNotificationPayload) => void;
  onPermissionsUpdated: (service: ServiceId) => void;
  onResourceUpdated: (service: ServiceId, payload: ResourceUpdatedPayload) => void;
};

/** SignalR logs through console by default; route only real errors to the dev console. */
const quietLogger: ILogger = {
  log(level, message) {
    if (__DEV__ && level >= LogLevel.Critical) console.warn(`[signalr] ${message}`);
  },
};

const RETRY_DELAYS = [2_000, 5_000, 15_000, 30_000, 60_000];

/** One connection to `/hubs/notifications` of a back-end, with token refresh and backoff. */
export class ServiceHub {
  private connection: HubConnection | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private attempts = 0;
  private stopped = true;

  constructor(
    private readonly service: ServiceId,
    private readonly handlers: HubHandlers,
  ) {}

  start() {
    this.stopped = false;
    void this.connect();
  }

  async stop() {
    this.stopped = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    const connection = this.connection;
    this.connection = null;
    if (connection) await connection.stop().catch(() => undefined);
  }

  private build() {
    const connection = new HubConnectionBuilder()
      .withUrl(`${apiFor(this.service).baseUrl}/hubs/notifications`, {
        // Read lazily so reconnects pick up refreshed tokens.
        accessTokenFactory: () => tokenStore.get(this.service)?.token ?? '',
      })
      .withAutomaticReconnect(RETRY_DELAYS)
      .configureLogging(quietLogger)
      .build();

    connection.on('ReceiveNotification', (payload: ReceiveNotificationPayload) => this.handlers.onNotification(this.service, payload ?? {}));
    connection.on('PermissionsUpdated', () => this.handlers.onPermissionsUpdated(this.service));
    connection.on('ResourceUpdated', (payload: ResourceUpdatedPayload) => this.handlers.onResourceUpdated(this.service, payload ?? {}));
    connection.onclose(() => {
      if (!this.stopped) this.scheduleRetry();
    });
    return connection;
  }

  private async connect() {
    if (this.stopped || !tokenStore.get(this.service)) return;
    if (this.connection?.state === HubConnectionState.Connected) return;
    this.connection = this.connection ?? this.build();
    try {
      await this.connection.start();
      this.attempts = 0;
    } catch {
      // Expired token: any authenticated REST call refreshes it; the next attempt uses the new one.
      void apiFor(this.service)
        .get<number>('/api/notifications/total-unread')
        .catch(() => undefined);
      this.scheduleRetry();
    }
  }

  private scheduleRetry() {
    if (this.stopped || this.retryTimer) return;
    const delay = RETRY_DELAYS[Math.min(this.attempts, RETRY_DELAYS.length - 1)];
    this.attempts += 1;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (this.connection?.state === HubConnectionState.Disconnected) this.connection = null;
      void this.connect();
    }, delay);
  }
}
