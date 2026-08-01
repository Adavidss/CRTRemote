import { decode, encode, type ConnectionRole, type TransportKind, type WireEnvelope } from "@/protocol";
import { BaseTransport } from "./BaseTransport.ts";

export interface WebSocketTransportOptions {
  /** e.g. `ws://crt.local:7890/socket`. */
  url: string;
  role: ConnectionRole;
  clientId: string;
  clientName?: string;
}

/**
 * The preferred transport: one socket, frames both ways, push in both directions.
 *
 * The relay tells the two halves apart by a `role` query parameter, so the same
 * class serves the host and the remote — nothing in here knows which end it is
 * on, which is what keeps the two repositories' networking identical.
 */
export class WebSocketTransport extends BaseTransport {
  readonly kind: TransportKind = "websocket";
  readonly endpoint: string;

  private socket: WebSocket | null = null;
  private closedByUs = false;

  constructor(options: WebSocketTransportOptions) {
    super("websocket");
    const url = new URL(options.url);
    url.searchParams.set("role", options.role);
    url.searchParams.set("clientId", options.clientId);
    if (options.clientName) url.searchParams.set("name", options.clientName);
    this.endpoint = url.toString();
  }

  connect(): Promise<void> {
    this.closedByUs = false;
    return new Promise((resolve) => {
      this.open(resolve);
    });
  }

  private open(onSettled?: () => void): void {
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) return;

    this.setConnectionStatus(this.attempt === 0 ? "connecting" : "reconnecting", this.endpoint);

    let socket: WebSocket;
    try {
      socket = new WebSocket(this.endpoint);
    } catch (error) {
      // A malformed URL throws synchronously. Treat it as a failed attempt so
      // the backoff still applies rather than looping on the caller's retry.
      this.setConnectionStatus("error", error instanceof Error ? error.message : "bad WebSocket URL");
      this.scheduleReconnect(() => this.open());
      onSettled?.();
      return;
    }
    this.socket = socket;

    socket.addEventListener("open", () => {
      this.onConnected();
      this.drainOutbox((envelope) => socket.send(encode(envelope)));
      onSettled?.();
    });

    socket.addEventListener("message", (event) => {
      const result = decode(typeof event.data === "string" ? event.data : "");
      if (!result.ok) {
        console.warn("WebSocketTransport: dropped a frame —", result.error);
        return;
      }
      this.emitFrame(result.envelope);
    });

    socket.addEventListener("error", () => {
      // The error event carries nothing useful in browsers; `close` follows and
      // does the actual work. Recording the detail keeps the UI honest.
      this.setStatus({ detail: "connection error" });
    });

    socket.addEventListener("close", (event) => {
      this.socket = null;
      onSettled?.();
      if (this.closedByUs) {
        this.setConnectionStatus("disconnected", "closed");
        return;
      }
      const reason = event.reason || `socket closed (${event.code})`;
      this.setConnectionStatus("reconnecting", reason);
      this.scheduleReconnect(() => this.open());
    });
  }

  disconnect(): void {
    this.closedByUs = true;
    this.cancelReconnect();
    this.socket?.close(1000, "client disconnect");
    this.socket = null;
    this.setConnectionStatus("disconnected");
  }

  send(envelope: WireEnvelope): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(encode(envelope));
      return;
    }
    this.enqueue(envelope);
  }
}

/**
 * Guess the relay's WebSocket URL from where the page was served.
 *
 * On the Pi, CRTHost is served by the same process that runs the relay, so the
 * page's own origin is the right answer. From GitHub Pages it is not — the
 * remote has to be told, which is what the connection screen is for.
 */
export function defaultWebSocketUrl(port = 7890): string {
  if (typeof window === "undefined") return `ws://localhost:${port}/socket`;
  const secure = window.location.protocol === "https:";
  const host = window.location.hostname || "localhost";
  return `${secure ? "wss" : "ws"}://${host}:${port}/socket`;
}
