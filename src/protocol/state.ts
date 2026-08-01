import type { AppDescriptor, AppId } from "./apps.ts";
import type { PetAction } from "./pet.ts";

/**
 * `HostState` is the whole of what the remote is allowed to know.
 *
 * The host is the only writer. The remote holds a copy, renders it, and sends
 * commands; it never edits its copy to make the UI feel faster, because a
 * local edit that the host then declines is a lie the user has to notice and
 * undo. Optimism lives in the transition (a button that dims while its ack is
 * outstanding), never in the state.
 */

export type DisplayMode = "remote" | "computer";
export type PreviewMode = "off" | "low" | "high";
export type AppRunState = "idle" | "starting" | "running" | "paused";
export type ConnectionRole = "host" | "remote";

export interface HostIdentity {
  /** Stable per install, so the phone can recognise a host it has seen before. */
  id: string;
  /** User-facing, editable: "Living room CRT". */
  name: string;
  /** CRTHost's own version. */
  version: string;
  protocolVersion: number;
  /** "Raspberry Pi 5", "Development host (macOS)". */
  model: string;
  /**
   * Opt-in feature flags. The remote hides controls the host cannot honour
   * instead of offering a button that silently does nothing.
   */
  capabilities: HostCapability[];
}

export type HostCapability =
  | "preview"
  | "computer-display-mode"
  | "emulation"
  | "video"
  | "audio"
  | "weather"
  // oxlint-disable-next-line ban-types
  | (string & {});

export interface PaletteDescriptor {
  id: string;
  label: string;
  /** True when every entry differs only in luminance. */
  monochrome: boolean;
  /** Swatch, brightest last, for the phone's palette picker. */
  swatch: string[];
}

export interface DisplayState {
  mode: DisplayMode;
  /** Framebuffer size, before nearest-neighbour scaling. */
  width: number;
  height: number;
  /** Size actually driven to the tube. Always an integer multiple of the above. */
  outputWidth: number;
  outputHeight: number;
  /** Fraction (0–0.2) trimmed off every edge to survive CRT overscan. */
  overscan: number;
  paletteId: string;
  palettes: PaletteDescriptor[];
  /** A mode change the host has proposed and is waiting to have confirmed. */
  pendingMode: DisplayMode | null;
}

export interface AppsState {
  catalog: AppDescriptor[];
  activeAppId: AppId | null;
  runState: AppRunState;
  /**
   * One line the active application wants shown on the phone — "9:41",
   * "Feeding…", "World 1-2". Purely cosmetic; the phone must not parse it.
   */
  statusLine: string | null;
  /** Launch history, most recent first. Drives "Recent" on the phone's home. */
  recentAppIds: AppId[];
}

export interface PetState {
  name: string;
  species: string;
  /** Seconds alive across every session, not since boot. */
  ageSeconds: number;
  stage: "egg" | "baby" | "child" | "teen" | "adult";
  mood: PetMood;
  /** Every meter is 0–100. Higher is better for all of them except hunger. */
  hunger: number;
  energy: number;
  health: number;
  happiness: number;
  cleanliness: number;
  friendship: number;
  asleep: boolean;
  sick: boolean;
  /** Whatever the pet is "saying", for the speech bubble. Host-authored. */
  message: string | null;
  lastAction: PetAction | null;
  lastActionAt: number | null;
  /** Set while an interaction animation is playing; the phone dims its buttons. */
  busyUntil: number | null;
}

export type PetMood =
  | "happy"
  | "content"
  | "bored"
  | "sad"
  | "hungry"
  | "tired"
  | "sick"
  | "sleeping"
  | "excited";

export type GameSystem =
  | "gb"
  | "gbc"
  | "gba"
  | "nes"
  | "snes"
  | "genesis"
  | "arcade"
  | "psx"
  | "native";

export interface GameEntry {
  id: string;
  title: string;
  system: GameSystem;
  /**
   * Cover art. Either a data URL or a path the host serves. The phone renders
   * it as-is; when it is null the phone draws a generated cover from the title
   * so a library with no artwork still looks deliberate.
   */
  cover: string | null;
  library: "published" | "user";
  /** False when the ROM is missing or its core is not installed. */
  playable: boolean;
  unavailableReason?: string;
  lastPlayedAt: number | null;
  playSeconds: number;
  hasSave: boolean;
}

export interface CoreDescriptor {
  id: string;
  system: GameSystem;
  label: string;
  installed: boolean;
  /** e.g. "libretro:gambatte". Informational — the phone only displays it. */
  provider: string;
}

export interface GamesState {
  library: GameEntry[];
  cores: CoreDescriptor[];
  activeGameId: string | null;
  /** The emulator session, distinct from the Games app's own run state. */
  session: "stopped" | "loading" | "running" | "paused";
  /** Set when a launch failed, cleared on the next successful launch. */
  error: string | null;
}

export type MediaKind = "video" | "photo" | "audio";

export interface MediaState {
  kind: MediaKind | null;
  title: string | null;
  playing: boolean;
  positionSeconds: number;
  durationSeconds: number;
  /** 0–1. */
  volume: number;
  muted: boolean;
  /** Position in the current playlist / album, 1-based for display. */
  index: number;
  count: number;
  shuffle: boolean;
  repeat: boolean;
}

export interface ClockState {
  faceId: string;
  faces: Array<{ id: string; label: string }>;
  format24h: boolean;
  showSeconds: boolean;
  showDate: boolean;
  /** IANA zone the CRT renders in. */
  timezone: string;
}

export interface WeatherState {
  location: string | null;
  updatedAt: number | null;
  units: "metric" | "imperial";
  current: { temp: number; code: number; label: string; windKph: number } | null;
  forecast: Array<{ dayLabel: string; high: number; low: number; code: number }>;
  /** Set when the host could not reach its weather source. */
  error: string | null;
}

export interface PreviewState {
  mode: PreviewMode;
  /** Effective publish interval for the current mode. */
  intervalMs: number;
  /**
   * Increments on every published frame. A remote that sees the sequence stop
   * advancing knows the feed stalled even though the socket is still open.
   */
  sequence: number;
  lastFrameAt: number | null;
  /** False in computer display mode — the host has nothing of its own to show. */
  available: boolean;
}

export interface HostSettings {
  /** 0–1. Applied by remapping the palette, never as a CSS filter. */
  brightness: number;
  volume: number;
  /** Minutes of no input before the host falls back to the attract screen. 0 disables. */
  idleTimeoutMinutes: number;
  /** Slowly drifts static content so a left-on tube does not retain it. */
  burnInProtection: boolean;
  /** Cycle animations when idle rather than sitting on the launcher. */
  attractMode: boolean;
}

export interface HostState {
  protocolVersion: number;
  identity: HostIdentity;
  /**
   * Host clock. Sent so the phone can render every other timestamp in host
   * time and show the drift rather than silently disagreeing about "now".
   */
  time: { epochMs: number; timezone: string; uptimeMs: number };
  display: DisplayState;
  apps: AppsState;
  preview: PreviewState;
  pet: PetState;
  games: GamesState;
  media: MediaState;
  clock: ClockState;
  weather: WeatherState;
  settings: HostSettings;
}

/** Everything in `HostState` that is a mergeable slice. */
export type HostStateSlices = Omit<HostState, "protocolVersion">;

/**
 * A patch is a two-level shallow merge: named slices replace named fields, and
 * anything not mentioned is left alone. Arrays are replaced wholesale — there
 * is no element-wise merging, which keeps `applyPatch` total and obvious.
 *
 * Two levels rather than one is a deliberate compromise: it lets the host send
 * `{ games: { activeGameId } }` without re-sending a hundred-entry library,
 * while stopping well short of a general-purpose deep-merge whose behaviour
 * nobody can predict at a glance.
 */
export type HostStatePatch = {
  [K in keyof HostStateSlices]?: Partial<HostStateSlices[K]>;
};

function isMergeable(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Apply a patch, returning a new state. Never mutates its input. */
export function applyPatch(state: HostState, patch: HostStatePatch): HostState {
  const next: Record<string, unknown> = { ...state };
  for (const key of Object.keys(patch)) {
    const incoming = (patch as Record<string, unknown>)[key];
    if (incoming === undefined) continue;
    const current = next[key];
    next[key] = isMergeable(current) && isMergeable(incoming)
      ? { ...current, ...incoming }
      : incoming;
  }
  return next as unknown as HostState;
}

/**
 * Produce the smallest patch that turns `prev` into `next`, or null when they
 * already agree. Comparison is by identity at the field level, so a slice
 * rebuilt from unchanged parts still counts as changed — cheap, and it errs
 * towards sending too much rather than too little.
 */
export function diffState(prev: HostState, next: HostState): HostStatePatch | null {
  const patch: Record<string, unknown> = {};
  const before = prev as unknown as Record<string, unknown>;
  const after = next as unknown as Record<string, unknown>;
  let changed = false;

  for (const key of Object.keys(after)) {
    if (key === "protocolVersion") continue;
    const a = before[key];
    const b = after[key];
    if (a === b) continue;

    if (isMergeable(a) && isMergeable(b)) {
      const slice: Record<string, unknown> = {};
      let sliceChanged = false;
      for (const field of Object.keys(b)) {
        if (!Object.is(a[field], b[field])) {
          slice[field] = b[field];
          sliceChanged = true;
        }
      }
      // A field present in `prev` but gone from `next` cannot be expressed as a
      // merge, so fall back to replacing the slice outright.
      for (const field of Object.keys(a)) {
        if (!(field in b)) {
          patch[key] = b;
          changed = true;
          sliceChanged = false;
          break;
        }
      }
      if (sliceChanged) {
        patch[key] = slice;
        changed = true;
      }
    } else {
      patch[key] = b;
      changed = true;
    }
  }

  return changed ? (patch as HostStatePatch) : null;
}
