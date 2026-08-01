import {
  applyPatch,
  commandEnvelope,
  newId,
  PROTOCOL_VERSION,
  type ClientInfo,
  type ConfirmRequest,
  type HostIdentity,
  type HostMessage,
  type HostState,
  type NoticeLevel,
  type PreviewFrame,
  type RemoteCommand,
  type Transport,
  type TransportStatus,
  type WireEnvelope,
} from "@/protocol";
import { createStore, type Store } from "@/utils/store.ts";

/**
 * The remote's half of the conversation.
 *
 * It holds a *copy* of the host's state and never edits it. Every control on
 * every screen reads from that copy and writes by sending a command — so a
 * button that the host declines simply does not change, which is the honest
 * outcome, and there is no local model that can drift out of step with the
 * thing across the room.
 *
 * What it does track locally is which commands are still in flight, which is
 * what lets a button dim while its acknowledgement is outstanding. That is
 * optimism about the *transition*, not about the result.
 */

export interface Notice {
  id: string;
  level: NoticeLevel;
  message: string;
  at: number;
}

export interface ConnectionSnapshot {
  transport: TransportStatus | null;
  identity: HostIdentity | null;
  state: HostState | null;
  preview: PreviewFrame | null;
  confirm: ConfirmRequest | null;
  notices: Notice[];
  /** Command ids sent but not yet acknowledged. */
  pending: readonly string[];
  /** Set when the host and the remote do not speak the same protocol. */
  protocolMismatch: string | null;
  /** Host clock minus ours, measured on every pong. */
  clockSkewMs: number | null;
}

const EMPTY: ConnectionSnapshot = {
  transport: null,
  identity: null,
  state: null,
  preview: null,
  confirm: null,
  notices: [],
  pending: [],
  protocolMismatch: null,
  clockSkewMs: null,
};

const PING_INTERVAL_MS = 5000;
const COMMAND_TIMEOUT_MS = 8000;
const NOTICE_TTL_MS = 5000;

export class HostConnection {
  readonly store: Store<ConnectionSnapshot> = createStore(EMPTY);

  private transport: Transport | null = null;
  private detach: Array<() => void> = [];
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private readonly inFlight = new Map<string, ReturnType<typeof setTimeout>>();
  private pingSentAt = 0;
  private readonly client: ClientInfo;

  constructor(client: Partial<ClientInfo> = {}) {
    this.client = {
      id: readOrCreateClientId(),
      name: client.name ?? describeClient(),
      kind: client.kind ?? guessKind(),
      appVersion: client.appVersion ?? "0.1.0",
      protocolVersion: PROTOCOL_VERSION,
    };
  }

  getClientInfo(): ClientInfo {
    return this.client;
  }

  async connect(transport: Transport): Promise<void> {
    this.teardown();
    this.transport = transport;
    // A new link means a new host until proven otherwise; keeping the old
    // state on screen while connecting elsewhere would show the wrong device.
    this.store.set({ ...EMPTY, transport: transport.getStatus() });

    this.detach.push(transport.onFrame((envelope) => this.receive(envelope)));
    this.detach.push(
      transport.onStatus((status) => {
        this.store.set((current) => ({ ...current, transport: status }));
        if (status.status === "connected") this.handshake();
      }),
    );

    await transport.connect();

    this.pingTimer = setInterval(() => {
      if (this.transport?.getStatus().status !== "connected") return;
      this.pingSentAt = Date.now();
      this.transport.send(commandEnvelope({ type: "system.ping", at: this.pingSentAt }));
    }, PING_INTERVAL_MS);
  }

  disconnect(): void {
    this.teardown();
    this.store.set({ ...EMPTY });
  }

  private teardown(): void {
    for (const off of this.detach) off();
    this.detach = [];
    if (this.pingTimer !== null) clearInterval(this.pingTimer);
    this.pingTimer = null;
    for (const timer of this.inFlight.values()) clearTimeout(timer);
    this.inFlight.clear();
    this.transport?.disconnect();
    this.transport = null;
  }

  private handshake(): void {
    this.transport?.send(commandEnvelope({ type: "system.hello", client: this.client }));
  }

  /** Send a command. Returns its id so a caller can watch for the ack. */
  send(command: RemoteCommand): string {
    const envelope = commandEnvelope(command);
    this.transport?.send(envelope);

    this.store.set((current) => ({ ...current, pending: [...current.pending, envelope.id] }));
    // A command with no answer is a failure the user has to be told about;
    // leaving the button dimmed forever is the worst of both.
    this.inFlight.set(
      envelope.id,
      setTimeout(() => {
        this.inFlight.delete(envelope.id);
        this.resolvePending(envelope.id);
        this.pushNotice("warn", "The CRT did not answer.");
      }, COMMAND_TIMEOUT_MS),
    );
    return envelope.id;
  }

  answerConfirm(requestId: string, accepted: boolean): void {
    this.send({ type: "system.confirm", requestId, accepted });
    this.store.set((current) => ({
      ...current,
      confirm: current.confirm?.id === requestId ? null : current.confirm,
    }));
  }

  dismissNotice(id: string): void {
    this.store.set((current) => ({ ...current, notices: current.notices.filter((n) => n.id !== id) }));
  }

  private resolvePending(commandId: string): void {
    const timer = this.inFlight.get(commandId);
    if (timer) clearTimeout(timer);
    this.inFlight.delete(commandId);
    this.store.set((current) => ({
      ...current,
      pending: current.pending.filter((id) => id !== commandId),
    }));
  }

  private pushNotice(level: NoticeLevel, message: string): void {
    const notice: Notice = { id: newId(), level, message, at: Date.now() };
    this.store.set((current) => ({ ...current, notices: [...current.notices.slice(-2), notice] }));
    setTimeout(() => this.dismissNotice(notice.id), NOTICE_TTL_MS);
  }

  private receive(envelope: WireEnvelope): void {
    if (envelope.kind !== "message") return;
    this.apply(envelope.message);
  }

  private apply(message: HostMessage): void {
    switch (message.type) {
      case "hello":
        this.store.set((current) => ({
          ...current,
          identity: message.identity,
          protocolMismatch:
            message.protocolVersion === PROTOCOL_VERSION
              ? null
              : `This remote speaks protocol v${PROTOCOL_VERSION}; ${message.identity.name} speaks v${message.protocolVersion}.`,
        }));
        break;

      case "state.full":
        this.store.set((current) => ({ ...current, state: message.state }));
        break;

      case "state.patch":
        this.store.set((current) =>
          current.state ? { ...current, state: applyPatch(current.state, message.patch) } : current,
        );
        break;

      case "preview.frame":
        this.store.set((current) => ({ ...current, preview: message.frame }));
        break;

      case "ack":
        this.resolvePending(message.commandId);
        if (!message.ok && message.error) this.pushNotice("warn", message.error);
        break;

      case "notice":
        this.pushNotice(message.level, message.message);
        break;

      case "confirm.request":
        this.store.set((current) => ({ ...current, confirm: message.request }));
        break;

      case "confirm.cancel":
        this.store.set((current) => ({
          ...current,
          confirm: current.confirm?.id === message.requestId ? null : current.confirm,
        }));
        break;

      case "pong": {
        const now = Date.now();
        const roundTrip = now - message.at;
        this.transport?.noteLatency?.(roundTrip);
        // Halve the round trip to estimate one-way delay before comparing clocks.
        this.store.set((current) => ({
          ...current,
          clockSkewMs: Math.round(message.hostTime - (message.at + roundTrip / 2)),
        }));
        break;
      }
    }
  }
}

const CLIENT_ID_KEY = "crtremote:clientId";

function readOrCreateClientId(): string {
  try {
    const existing = window.localStorage.getItem(CLIENT_ID_KEY);
    if (existing) return existing;
    const created = newId();
    window.localStorage.setItem(CLIENT_ID_KEY, created);
    return created;
  } catch {
    return newId();
  }
}

function guessKind(): ClientInfo["kind"] {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/iPhone|Android|Mobile/i.test(ua)) return "phone";
  return "desktop";
}

function describeClient(): string {
  if (typeof navigator === "undefined") return "Remote";
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android phone";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "PC";
  return "Remote";
}
