import type { WireEnvelope } from "./envelope.ts";

/**
 * The seam between "what we say" and "how it gets there".
 *
 * Both applications talk to a `Transport` and nothing else. WebSockets, HTTP
 * polling, an in-process loopback and a test double are all just objects that
 * satisfy this interface, which is what keeps networking out of the UI and the
 * application logic — neither side contains the word "WebSocket" outside of
 * `services/transports/`.
 *
 * The interface is deliberately small and push-based. A transport is
 * responsible for its own reconnection; callers are responsible for nothing
 * beyond `connect`, `send`, and reacting to what arrives.
 */

export type TransportKind =
  | "websocket"
  | "http-polling"
  | "loopback"
  | "simulated"
  /** Two same-origin browser tabs, via BroadcastChannel. No server involved. */
  | "broadcast";

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

export interface TransportStatus {
  status: ConnectionStatus;
  kind: TransportKind;
  /** Human-readable, safe to show in the UI. Null when there is nothing to say. */
  detail: string | null;
  /** Round-trip time in ms from the last ping, when the transport measures it. */
  latencyMs: number | null;
  /** How many times it has re-established since `connect()` was called. */
  reconnects: number;
  /** When the transport is waiting to retry, the host-clock time it will do so. */
  retryAt: number | null;
}

export type Unsubscribe = () => void;

export interface Transport {
  readonly kind: TransportKind;
  /** Where this transport points, for display: "ws://crt.local:7890". */
  readonly endpoint: string;

  connect(): Promise<void>;
  disconnect(): void;

  /**
   * Queue a frame. Implementations buffer while reconnecting rather than
   * throwing, so callers never have to ask whether the link is up — but a
   * transport may drop buffered frames it considers stale, and says so in its
   * documentation.
   */
  send(envelope: WireEnvelope): void;

  onFrame(handler: (envelope: WireEnvelope) => void): Unsubscribe;
  onStatus(handler: (status: TransportStatus) => void): Unsubscribe;

  /** Current status, for a component mounting after the fact. */
  getStatus(): TransportStatus;

  /**
   * Report a measured round trip.
   *
   * Latency is timed at the application layer, where the ping/pong pair lives,
   * but it belongs in the transport's status because that is what the UI reads.
   * Optional: a loopback has nothing meaningful to report.
   */
  noteLatency?(latencyMs: number | null): void;
}

export const CONNECTED_STATUSES: readonly ConnectionStatus[] = ["connected"];

export function isLive(status: ConnectionStatus): boolean {
  return status === "connected";
}

/** Whether the transport is doing something that will probably resolve itself. */
export function isPending(status: ConnectionStatus): boolean {
  return status === "connecting" || status === "reconnecting";
}
