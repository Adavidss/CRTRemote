import { decode, encode, type TransportKind, type WireEnvelope } from "@/protocol";
import { BaseTransport } from "./BaseTransport.ts";

export interface LoopbackOptions {
  /**
   * Artificial one-way delay. Zero would deliver synchronously inside the
   * caller's own `send`, which hides every ordering bug that a real network
   * will find — so the default is a small delay, not none.
   */
  latencyMs?: number;
  /** Fraction of frames to drop, for testing how the UI copes. */
  lossRate?: number;
  label?: string;
}

/**
 * An in-process link between two halves of the system.
 *
 * This is what makes both applications testable with nothing else running:
 * CRTHost pairs its real `RemoteService` with a mock remote client, and
 * CRTRemote pairs its real connection layer with the simulated host. Neither
 * needs a socket, a server, or a Raspberry Pi.
 *
 * Frames are serialised and parsed on the way through even though both ends
 * share a heap. Passing the live object would let a mutation on one side show
 * up on the other, and would let a value that cannot survive `JSON.stringify`
 * work perfectly here and fail the moment it met a real transport.
 */
export class LoopbackTransport extends BaseTransport {
  readonly kind: TransportKind = "loopback";
  readonly endpoint: string;

  private peer: LoopbackTransport | null = null;
  private connected = false;
  private readonly options: Required<Omit<LoopbackOptions, "label">>;
  private readonly pending = new Set<ReturnType<typeof setTimeout>>();

  constructor(options: LoopbackOptions = {}) {
    super("loopback");
    this.options = { latencyMs: options.latencyMs ?? 8, lossRate: options.lossRate ?? 0 };
    this.endpoint = options.label ? `loopback:${options.label}` : "loopback";
  }

  static pair(options: LoopbackOptions = {}): [LoopbackTransport, LoopbackTransport] {
    const a = new LoopbackTransport({ ...options, label: `${options.label ?? "pair"}:a` });
    const b = new LoopbackTransport({ ...options, label: `${options.label ?? "pair"}:b` });
    a.peer = b;
    b.peer = a;
    return [a, b];
  }

  async connect(): Promise<void> {
    this.connected = true;
    this.setConnectionStatus("connected", "in-process");
    this.drainOutbox((envelope) => this.deliver(envelope));
  }

  disconnect(): void {
    this.connected = false;
    for (const timer of this.pending) clearTimeout(timer);
    this.pending.clear();
    this.setConnectionStatus("disconnected");
  }

  send(envelope: WireEnvelope): void {
    if (!this.connected) {
      this.enqueue(envelope);
      return;
    }
    this.deliver(envelope);
  }

  private deliver(envelope: WireEnvelope): void {
    const peer = this.peer;
    if (!peer || !peer.connected) return;
    if (this.options.lossRate > 0 && Math.random() < this.options.lossRate) return;

    const wire = encode(envelope);
    const timer = setTimeout(() => {
      this.pending.delete(timer);
      const result = decode(wire);
      if (!result.ok) {
        console.warn("LoopbackTransport: dropped a frame —", result.error);
        return;
      }
      peer.emitFrame(result.envelope);
    }, this.options.latencyMs);
    this.pending.add(timer);
  }
}
