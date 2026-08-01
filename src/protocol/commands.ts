import type { AppId } from "./apps.ts";
import type { InputButton, InputPhase } from "./input.ts";
import type { PetAction } from "./pet.ts";
import type { ClockState, DisplayMode, HostSettings, PreviewMode } from "./state.ts";

/**
 * Everything a remote may ask the host to do.
 *
 * Commands are requests, not assignments — the host is free to decline, clamp,
 * or defer any of them, and it answers with an `ack` either way. The union is
 * flat (no `payload` wrapper) purely for ergonomics at the call sites:
 * `send({ type: "app.launch", appId: "pet" })`.
 */

export interface ClientInfo {
  /** Stable per browser profile, so the host can recognise a returning phone. */
  id: string;
  name: string;
  kind: "phone" | "tablet" | "desktop" | "simulator" | "mock";
  appVersion: string;
  protocolVersion: number;
}

export type MediaAction =
  | "play"
  | "pause"
  | "toggle"
  | "stop"
  | "next"
  | "previous"
  | "seek"
  | "volume"
  | "mute"
  | "shuffle"
  | "repeat";

export type RemoteCommand =
  // — session ————————————————————————————————————————————————
  | { type: "system.hello"; client: ClientInfo }
  | { type: "system.requestState" }
  | { type: "system.ping"; at: number }
  /** Flash the host's name on the tube — "which Pi am I holding?" */
  | { type: "system.identify" }
  | { type: "system.setSetting"; key: keyof HostSettings; value: number | boolean }
  /** Answer to a `confirm.request` the host raised. */
  | { type: "system.confirm"; requestId: string; accepted: boolean }

  // — application lifecycle ——————————————————————————————————
  | { type: "app.launch"; appId: AppId }
  | { type: "app.exit" }
  | { type: "app.pause" }
  | { type: "app.resume" }

  // — input ——————————————————————————————————————————————————
  | { type: "input.button"; button: InputButton; phase: InputPhase }
  /** Normalised 0–1 within the safe area. Reserved for a future touchpad. */
  | { type: "input.pointer"; x: number; y: number; phase: "down" | "move" | "up" }

  // — display ————————————————————————————————————————————————
  /**
   * Without `confirmed`, the host replies with a `confirm.request` rather than
   * switching: dropping the CRT onto an HDMI input mid-session is disruptive
   * enough to be worth one deliberate tap.
   */
  | { type: "display.setMode"; mode: DisplayMode; confirmed?: boolean }
  | { type: "display.setPalette"; paletteId: string }
  | { type: "display.setOverscan"; overscan: number }

  // — preview ————————————————————————————————————————————————
  | { type: "preview.configure"; mode: PreviewMode }
  /** One frame, now, regardless of the configured cadence. */
  | { type: "preview.request" }

  // — digital pet ————————————————————————————————————————————
  | { type: "pet.interact"; action: PetAction }
  | { type: "pet.rename"; name: string }

  // — games ——————————————————————————————————————————————————
  | { type: "games.launch"; gameId: string }
  | { type: "games.stop" }
  | { type: "games.pause" }
  | { type: "games.resume" }
  | { type: "games.saveState" }
  | { type: "games.loadState" }

  // — media ——————————————————————————————————————————————————
  | { type: "media.control"; action: MediaAction; value?: number }

  // — per-app settings ———————————————————————————————————————
  | { type: "clock.configure"; patch: Partial<ClockState> }
  | { type: "weather.refresh" };

export type RemoteCommandType = RemoteCommand["type"];

/** Narrowing helper: `CommandOf<"app.launch">` is the launch variant. */
export type CommandOf<T extends RemoteCommandType> = Extract<RemoteCommand, { type: T }>;
