import type { AppId } from "./apps.ts";
import type { HostIdentity, HostState, HostStatePatch } from "./state.ts";

/** Everything the host may say to a remote. */

export interface PreviewFrame {
  /** A complete `data:` URL. Encoding is the host's choice. */
  image: string;
  sequence: number;
  capturedAt: number;
  width: number;
  height: number;
  /** What was on screen when it was taken, so a late frame can be labelled. */
  appId: AppId | null;
}

/**
 * A yes/no the host needs from whoever is holding the phone. The host does not
 * act until it gets a `system.confirm` back, and it may withdraw the request
 * (by clearing it from state) if the situation resolves itself.
 */
export interface ConfirmRequest {
  id: string;
  kind: "display-mode" | (string & {});
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Host-clock time after which the host will assume "no". */
  expiresAt: number | null;
}

export type NoticeLevel = "info" | "success" | "warn" | "error";

export type HostMessage =
  /** Sent unprompted on connect, before any state. */
  | { type: "hello"; identity: HostIdentity; protocolVersion: number }
  | { type: "state.full"; state: HostState }
  | { type: "state.patch"; patch: HostStatePatch }
  | { type: "preview.frame"; frame: PreviewFrame }
  | { type: "ack"; commandId: string; ok: boolean; error?: string }
  | { type: "notice"; level: NoticeLevel; message: string }
  | { type: "confirm.request"; request: ConfirmRequest }
  /** The host withdrew a pending confirmation (timed out, or resolved elsewhere). */
  | { type: "confirm.cancel"; requestId: string }
  | { type: "pong"; at: number; hostTime: number };

export type HostMessageType = HostMessage["type"];

export type MessageOf<T extends HostMessageType> = Extract<HostMessage, { type: T }>;
