import type { WireEnvelope } from "@/protocol";
import { BaseTransport } from "./BaseTransport.ts";

/**
 * The two halves talking through the browser, with no server at all.
 *
 * This exists because of a hard constraint on the hosted builds: GitHub Pages
 * forces HTTPS, and a secure page may not open `ws://` or `http://`. So the
 * deployed CRTRemote can never reach a relay on your LAN — which left the two
 * published sites as a pair of unconnected demos, each pretending the other
 * half existed.
 *
 * `BroadcastChannel` closes that gap for the case where both are open on the
 * same machine. Both sites deploy under one origin (`/CRTHost/` and
 * `/CRTRemote/` on the same domain), and a channel is shared by every same-
 * origin context in the browser — so the host in one tab and the remote in
 * another are genuinely wired together, over the real protocol, with no relay
 * process and nothing installed.
 *
 * What it is not: a network. Same browser, same machine, same origin. Driving
 * the CRT from your phone still needs the relay, and that is not a limitation
 * of this transport but of what a browser will let a web page do.
 *
 * `BroadcastChannel` never echoes to the context that posted, so a frame cannot
 * come back to its sender; peers are matched by role instead of by id.
 */

export type PeerRole = "host" | "remote";

/** Wrapper around the wire envelope, carrying who sent it. */
type ChannelMessage =
  | { crt: "frame"; role: PeerRole; id: string; envelope: WireEnvelope }
  | { crt: "presence"; role: PeerRole; id: string; event: "hello" | "here" | "bye" };

/** How often each side announces it is still there. */
const HEARTBEAT_MS = 2000;
/** Silence beyond this and the peer is treated as gone. */
const PEER_TIMEOUT_MS = 6500;

export interface BroadcastChannelTransportOptions {
  /** Which half of the system this is. Frames are only accepted from the other. */
  role: PeerRole;
  clientId: string;
  /** Channel name. Both halves must agree; the default is fine. */
  channel?: string;
}

export class BroadcastChannelTransport extends BaseTransport {
  readonly kind = "broadcast" as const;
  readonly endpoint: string;

  private readonly role: PeerRole;
  private readonly clientId: string;
  private readonly channelName: string;

  private channel: BroadcastChannel | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private lastPeerAt = 0;
  private peerId: string | null = null;

  constructor(options: BroadcastChannelTransportOptions) {
    super("broadcast");
    this.role = options.role;
    this.clientId = options.clientId;
    this.channelName = options.channel ?? "crt-os";
    this.endpoint = `broadcast:${this.channelName}`;
  }

  static get supported(): boolean {
    return typeof BroadcastChannel !== "undefined";
  }

  async connect(): Promise<void> {
    if (this.channel) return;
    if (!BroadcastChannelTransport.supported) {
      this.setConnectionStatus("error", "This browser has no BroadcastChannel.");
      return;
    }

    this.channel = new BroadcastChannel(this.channelName);
    this.channel.addEventListener("message", this.onMessage as EventListener);

    // "connecting" rather than "connected": the channel opens instantly, but
    // there is no one on the other end until a peer answers. Reporting a live
    // link here would show a connected remote with no host behind it.
    this.setConnectionStatus("connecting", "Waiting for the other half…");
    this.post({ crt: "presence", role: this.role, id: this.clientId, event: "hello" });

    this.heartbeat = setInterval(() => this.tick(), HEARTBEAT_MS);
  }

  disconnect(): void {
    if (this.heartbeat !== null) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
    if (this.channel) {
      this.post({ crt: "presence", role: this.role, id: this.clientId, event: "bye" });
      this.channel.removeEventListener("message", this.onMessage as EventListener);
      this.channel.close();
      this.channel = null;
    }
    this.peerId = null;
    this.lastPeerAt = 0;
    this.setConnectionStatus("disconnected", null);
  }

  send(envelope: WireEnvelope): void {
    // Buffer until a peer is actually there, so the state a remote sends before
    // the host tab has opened is not simply lost.
    if (!this.channel || !this.peerId) {
      this.enqueue(envelope);
      return;
    }
    this.post({ crt: "frame", role: this.role, id: this.clientId, envelope });
  }

  private onMessage = (event: MessageEvent<ChannelMessage>): void => {
    this.receive(event.data);
  };

  private post(message: ChannelMessage): void {
    try {
      this.channel?.postMessage(message);
    } catch {
      // Structured-clone failure on a frame we built ourselves would be a bug,
      // but it must not take the link down.
    }
  }

  private receive(message: ChannelMessage | null | undefined): void {
    // Same-origin, but not necessarily same application — ignore anything that
    // is not ours rather than trusting the channel name alone.
    if (!message || typeof message !== "object" || !("crt" in message)) return;
    if (message.role === this.role) return;

    if (message.crt === "presence") {
      if (message.event === "bye") {
        this.losePeer("The other half closed.");
        return;
      }
      // Answer a hello so the newcomer learns about us immediately rather than
      // waiting out a heartbeat interval.
      if (message.event === "hello") {
        this.post({ crt: "presence", role: this.role, id: this.clientId, event: "here" });
      }
      this.findPeer(message.id);
      return;
    }

    // A frame is itself proof the peer is alive.
    this.findPeer(message.id);
    this.emitFrame(message.envelope);
  }

  private findPeer(id: string): void {
    this.lastPeerAt = Date.now();
    if (this.peerId === id) return;
    this.peerId = id;
    this.onConnected();
    this.setConnectionStatus("connected", "Another tab in this browser");
    this.drainOutbox((envelope) =>
      this.post({ crt: "frame", role: this.role, id: this.clientId, envelope }),
    );
  }

  private losePeer(detail: string): void {
    if (!this.peerId) return;
    this.peerId = null;
    this.lastPeerAt = 0;
    this.setConnectionStatus("connecting", detail);
  }

  private tick(): void {
    this.post({ crt: "presence", role: this.role, id: this.clientId, event: "here" });
    // A tab that is closed without running its unload handler stops answering,
    // which is the only signal we get that it has gone.
    if (this.peerId && Date.now() - this.lastPeerAt > PEER_TIMEOUT_MS) {
      this.losePeer("The other half stopped answering.");
    }
  }
}
