import type { RemoteCommand } from "./commands.ts";
import type { HostMessage } from "./messages.ts";
import { PROTOCOL_VERSION } from "./version.ts";

/**
 * The frame every command and message travels in.
 *
 * Envelopes exist so that acknowledgements, ordering and version checks are
 * transport-independent: a WebSocket, an HTTP long-poll and an in-process
 * loopback all move the same objects, and none of them needs to understand
 * what is inside.
 */

export interface CommandEnvelope {
  v: number;
  kind: "command";
  id: string;
  /** Sender's clock. Only ever used for diagnostics — never for ordering. */
  sentAt: number;
  command: RemoteCommand;
}

export interface MessageEnvelope {
  v: number;
  kind: "message";
  id: string;
  sentAt: number;
  message: HostMessage;
}

export type WireEnvelope = CommandEnvelope | MessageEnvelope;

let counter = 0;

/** Unique enough for a LAN session; falls back when `crypto` is unavailable. */
export function newId(): string {
  const c: Crypto | undefined = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  counter += 1;
  return `id-${Date.now().toString(36)}-${counter.toString(36)}`;
}

export function commandEnvelope(command: RemoteCommand, id: string = newId()): CommandEnvelope {
  return { v: PROTOCOL_VERSION, kind: "command", id, sentAt: Date.now(), command };
}

export function messageEnvelope(message: HostMessage, id: string = newId()): MessageEnvelope {
  return { v: PROTOCOL_VERSION, kind: "message", id, sentAt: Date.now(), message };
}

export function encode(envelope: WireEnvelope): string {
  return JSON.stringify(envelope);
}

export type DecodeResult =
  | { ok: true; envelope: WireEnvelope }
  | { ok: false; error: string };

/**
 * Parse and structurally check one frame.
 *
 * Anything arriving over a socket is untrusted input, so this validates shape
 * before the rest of the system is allowed to believe it. It deliberately does
 * *not* validate the command's own fields: the host's command handler is a
 * switch that has to be defensive anyway, and duplicating every payload's
 * schema here would be one more thing to keep in sync for no extra safety.
 */
export function decode(raw: string | unknown): DecodeResult {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return { ok: false, error: "frame is not valid JSON" };
    }
  }

  if (typeof value !== "object" || value === null) {
    return { ok: false, error: "frame is not an object" };
  }

  const frame = value as Partial<WireEnvelope> & Record<string, unknown>;

  if (typeof frame.v !== "number") return { ok: false, error: "frame has no version" };
  if (frame.v !== PROTOCOL_VERSION) {
    return { ok: false, error: `protocol mismatch: peer speaks v${frame.v}, we speak v${PROTOCOL_VERSION}` };
  }
  if (typeof frame.id !== "string") return { ok: false, error: "frame has no id" };

  if (frame.kind === "command") {
    const command = frame.command as { type?: unknown } | undefined;
    if (!command || typeof command.type !== "string") {
      return { ok: false, error: "command frame has no command type" };
    }
    return { ok: true, envelope: frame as CommandEnvelope };
  }

  if (frame.kind === "message") {
    const message = frame.message as { type?: unknown } | undefined;
    if (!message || typeof message.type !== "string") {
      return { ok: false, error: "message frame has no message type" };
    }
    return { ok: true, envelope: frame as MessageEnvelope };
  }

  return { ok: false, error: `unknown frame kind: ${String(frame.kind)}` };
}
