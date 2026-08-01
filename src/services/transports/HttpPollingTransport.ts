import { decode, type ConnectionRole, type TransportKind, type WireEnvelope } from "@/protocol";
import { BaseTransport } from "./BaseTransport.ts";

export interface HttpPollingTransportOptions {
  /** Relay base URL, e.g. `http://crt.local:7890`. */
  baseUrl: string;
  role: ConnectionRole;
  clientId: string;
  /** How long the server may hold a poll open. */
  waitMs?: number;
  /** Gap between polls once one returns. Kept small; the wait does the work. */
  idleMs?: number;
}

/**
 * The fallback: long-polling over plain HTTP.
 *
 * This exists for the cases where a socket will not survive — a captive
 * network that proxies away upgrades, a corporate guest VLAN, an iOS Low Data
 * Mode quirk. It is deliberately a *long* poll rather than a fast one: holding
 * the request open for twenty-five seconds gives push-like latency for the one
 * direction that needs it, at one request per half-minute when nothing is
 * happening. A one-second poll would be simpler and would also keep a phone's
 * radio awake all evening for nothing.
 *
 * Preview frames are the one thing that suffers here — they are large and they
 * arrive on the same channel — so the relay drops all but the newest queued
 * frame for a client that has fallen behind.
 */
export class HttpPollingTransport extends BaseTransport {
  readonly kind: TransportKind = "http-polling";
  readonly endpoint: string;

  private readonly options: Required<HttpPollingTransportOptions>;
  private cursor = 0;
  private running = false;
  private abort: AbortController | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: HttpPollingTransportOptions) {
    super("http-polling");
    this.options = {
      waitMs: 25_000,
      idleMs: 150,
      ...options,
      baseUrl: options.baseUrl.replace(/\/+$/, ""),
    };
    this.endpoint = `${this.options.baseUrl}/api/frames`;
  }

  async connect(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.setConnectionStatus("connecting", this.endpoint);
    void this.poll();
  }

  disconnect(): void {
    this.running = false;
    this.cancelReconnect();
    this.abort?.abort();
    this.abort = null;
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.setConnectionStatus("disconnected");
  }

  send(envelope: WireEnvelope): void {
    this.enqueue(envelope);
    // Coalesce a burst of sends into one request. Without this, a held D-pad
    // produces a POST per frame and the fallback becomes unusable on exactly
    // the networks it exists to rescue.
    if (this.flushTimer !== null) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, 16);
  }

  private async flush(): Promise<void> {
    if (this.outbox.length === 0) return;
    const batch = this.outbox.splice(0, this.outbox.length);
    try {
      const response = await fetch(`${this.endpoint}/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          role: this.options.role,
          clientId: this.options.clientId,
          frames: batch,
        }),
      });
      if (!response.ok) throw new Error(`relay returned ${response.status}`);
    } catch (error) {
      // Put them back at the front so ordering survives a blip, then let the
      // poll loop's own error handling drive the reconnect.
      this.outbox.unshift(...batch);
      while (this.outbox.length > this.outboxLimit) this.outbox.shift();
      this.setStatus({ detail: error instanceof Error ? error.message : "send failed" });
    }
  }

  private async poll(): Promise<void> {
    while (this.running) {
      this.abort = new AbortController();
      const url = new URL(`${this.endpoint}/receive`);
      url.searchParams.set("role", this.options.role);
      url.searchParams.set("clientId", this.options.clientId);
      url.searchParams.set("cursor", String(this.cursor));
      url.searchParams.set("wait", String(this.options.waitMs));

      try {
        const response = await fetch(url, { signal: this.abort.signal });
        if (!response.ok) throw new Error(`relay returned ${response.status}`);
        const body = (await response.json()) as { cursor?: number; frames?: unknown[] };

        if (this.status.status !== "connected") this.onConnected();
        if (typeof body.cursor === "number") this.cursor = body.cursor;

        for (const raw of body.frames ?? []) {
          const result = decode(raw);
          if (!result.ok) {
            console.warn("HttpPollingTransport: dropped a frame —", result.error);
            continue;
          }
          this.emitFrame(result.envelope);
        }

        // Anything queued while the poll was open goes out immediately.
        if (this.outbox.length > 0) void this.flush();
        if (this.options.idleMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.options.idleMs));
        }
      } catch (error) {
        if (!this.running) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        this.setConnectionStatus(
          "reconnecting",
          error instanceof Error ? error.message : "poll failed",
        );
        await new Promise<void>((resolve) => this.scheduleReconnect(resolve));
      }
    }
  }
}
