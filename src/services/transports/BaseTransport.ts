import type {
  ConnectionStatus,
  Transport,
  TransportKind,
  TransportStatus,
  Unsubscribe,
  WireEnvelope,
} from "@/protocol";

/**
 * Bookkeeping every transport needs: listener sets, status fan-out, and the
 * reconnect schedule.
 *
 * Reconnection lives here rather than in each implementation because getting it
 * subtly wrong is the classic way a LAN app ends up hammering a sleeping host
 * with a connection attempt every 100 ms.
 */
export abstract class BaseTransport implements Transport {
  abstract readonly kind: TransportKind;
  abstract readonly endpoint: string;

  private readonly frameHandlers = new Set<(envelope: WireEnvelope) => void>();
  private readonly statusHandlers = new Set<(status: TransportStatus) => void>();

  protected status: TransportStatus;
  protected attempt = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  /** Frames queued while the link is down. */
  protected readonly outbox: WireEnvelope[] = [];
  /**
   * A bound on the outbox. Past this we drop the oldest: a remote that has been
   * unreachable for a minute does not need the sixty state updates it missed,
   * it needs the current one, and an unbounded queue on a Pi is a slow leak.
   */
  protected outboxLimit = 64;

  constructor(kind: TransportKind) {
    this.status = {
      status: "idle",
      kind,
      detail: null,
      latencyMs: null,
      reconnects: 0,
      retryAt: null,
    };
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): void;
  abstract send(envelope: WireEnvelope): void;

  onFrame(handler: (envelope: WireEnvelope) => void): Unsubscribe {
    this.frameHandlers.add(handler);
    return () => this.frameHandlers.delete(handler);
  }

  onStatus(handler: (status: TransportStatus) => void): Unsubscribe {
    this.statusHandlers.add(handler);
    handler(this.status);
    return () => this.statusHandlers.delete(handler);
  }

  getStatus(): TransportStatus {
    return this.status;
  }

  noteLatency(latencyMs: number | null): void {
    if (this.status.latencyMs === latencyMs) return;
    this.setStatus({ latencyMs });
  }

  protected emitFrame(envelope: WireEnvelope): void {
    for (const handler of this.frameHandlers) handler(envelope);
  }

  protected setStatus(patch: Partial<TransportStatus>): void {
    const next = { ...this.status, ...patch };
    if (
      next.status === this.status.status &&
      next.detail === this.status.detail &&
      next.latencyMs === this.status.latencyMs &&
      next.reconnects === this.status.reconnects &&
      next.retryAt === this.status.retryAt
    ) {
      return;
    }
    this.status = next;
    for (const handler of this.statusHandlers) handler(next);
  }

  protected setConnectionStatus(status: ConnectionStatus, detail: string | null = null): void {
    this.setStatus({ status, detail, retryAt: status === "connected" ? null : this.status.retryAt });
  }

  /**
   * Exponential backoff, capped, with jitter.
   *
   * The jitter matters when the Pi reboots: without it every remote that was
   * connected wakes up on exactly the same schedule and they all retry in the
   * same millisecond, forever.
   */
  protected scheduleReconnect(run: () => void): void {
    if (this.retryTimer !== null) return;
    const base = Math.min(8000, 500 * 2 ** Math.min(this.attempt, 4));
    const delay = Math.round(base * (0.8 + Math.random() * 0.4));
    this.attempt += 1;
    this.setStatus({ status: "reconnecting", retryAt: Date.now() + delay });
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      run();
    }, delay);
  }

  protected cancelReconnect(): void {
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.setStatus({ retryAt: null });
  }

  protected enqueue(envelope: WireEnvelope): void {
    this.outbox.push(envelope);
    while (this.outbox.length > this.outboxLimit) this.outbox.shift();
  }

  protected drainOutbox(write: (envelope: WireEnvelope) => void): void {
    while (this.outbox.length > 0) {
      write(this.outbox.shift()!);
    }
  }

  protected onConnected(): void {
    if (this.attempt > 0) {
      this.setStatus({ reconnects: this.status.reconnects + 1 });
    }
    this.attempt = 0;
    this.cancelReconnect();
    this.setConnectionStatus("connected");
  }
}
