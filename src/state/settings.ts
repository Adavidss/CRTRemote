import { createStore, useStore } from "@/utils/store.ts";

/**
 * The remote's own preferences — the only state this application owns.
 *
 * Everything about the CRT lives on the CRT. What is left is how this phone
 * should look and which host it should be pointed at, and that has to survive a
 * reload, so it goes to `localStorage` behind one small store.
 */

/**
 * The same phosphors the host offers, under the same names.
 *
 * The remote is a controller for a CRT, not a separate product with its own
 * look, so its themes are the tube's themes: pick P3 Amber on the phone and you
 * are looking at the palette the screen across the room is drawing in. Every
 * one separates its roles by *luminance* rather than hue, which is what keeps
 * the host legible on a black-and-white set — the phone inherits the discipline
 * for free, and stays readable at arm's length in a dark room.
 */
export const THEMES = ["p4-mono", "p1-green", "p3-amber", "p7-blue", "ember", "seafoam"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_LABELS: Record<Theme, string> = {
  "p4-mono": "P4 Mono",
  "p1-green": "P1 Green",
  "p3-amber": "P3 Amber",
  "p7-blue": "P7 Blue",
  ember: "Ember",
  seafoam: "Seafoam",
};

function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

export type ConnectionMode = "simulator" | "broadcast" | "cloud" | "websocket" | "http";

export interface RemoteSettings {
  theme: Theme;
  connectionMode: ConnectionMode;
  /** Hostname or IP of the relay. `crt.local` if mDNS is working. */
  hostAddress: string;
  hostPort: number;
  /** Base URL of the public relay, for pairing across networks. */
  cloudRelayUrl: string;
  /**
   * The room code the host is showing. Not a password chosen by anyone — the
   * relay issues it — but it is the only thing guarding the CRT, so it lives
   * only on the device that was told it.
   */
  cloudRoom: string;
  /** Haptic feedback on every control that changes something. */
  haptics: boolean;
  /** Ask the browser to keep the screen on while the remote is open. */
  keepAwake: boolean;
  /** Show the live preview card on Home. */
  showPreviewOnHome: boolean;
}

const DEFAULTS: RemoteSettings = {
  // P4 is the white phosphor a black-and-white television actually uses, and it
  // is the host's default for the same reason.
  theme: "p4-mono",
  // Simulator by default: a fresh install has no Raspberry Pi to talk to, and
  // opening onto a connection error would be a poor first impression of a
  // system that works perfectly well on its own.
  connectionMode: "simulator",
  hostAddress: "crt.local",
  hostPort: 7890,
  cloudRelayUrl: "",
  cloudRoom: "",
  haptics: true,
  keepAwake: true,
  showPreviewOnHome: true,
};

const STORAGE_KEY = "crtremote:settings";

/**
 * Whether this device has ever been configured.
 *
 * Used to decide if the relay may be auto-detected on first run. Once the user
 * has chosen anything, their choice stands — silently repointing a remote at a
 * different CRT because it happened to answer would be worse than an
 * unconfigured one.
 */
export function hasStoredSettings(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

function load(): RemoteSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<RemoteSettings>;
    // Merged rather than trusted: a settings blob written by an older build is
    // missing keys, and a missing key here means a screen renders undefined.
    const merged = { ...DEFAULTS, ...parsed };
    // The theme names changed when they were aligned with the host's palettes.
    // A phone that used an earlier build would restore a name the stylesheet no
    // longer defines and come up with no theme variables at all.
    if (!isTheme(merged.theme)) merged.theme = DEFAULTS.theme;
    return merged;
  } catch {
    return DEFAULTS;
  }
}

export const settingsStore = createStore<RemoteSettings>(load());

export function updateSettings(patch: Partial<RemoteSettings>): void {
  const next = { ...settingsStore.get(), ...patch };
  settingsStore.set(next);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing. The session still works; it just will not be remembered.
  }
  if (patch.theme) applyTheme(next.theme);
}

export function useSettings(): RemoteSettings {
  return useStore(settingsStore);
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

/** The relay's base URL for the current settings. */
export function relayUrls(settings: RemoteSettings): { websocket: string; http: string } {
  const host = settings.hostAddress.trim() || "crt.local";
  return {
    websocket: `ws://${host}:${settings.hostPort}/socket`,
    http: `http://${host}:${settings.hostPort}`,
  };
}

/**
 * Whether a plain-HTTP relay is reachable from where this page was served.
 *
 * A page on `https://` may not open `ws://` or `http://` — browsers block it as
 * mixed content, with no override. That makes the GitHub Pages deployment
 * simulator-only by construction, and the honest thing is to say so on the
 * settings screen rather than let the connection fail with a network error the
 * user cannot act on. Serving the remote from the relay itself (plain HTTP on
 * the LAN) is the way round it.
 */
export function isMixedContentBlocked(): boolean {
  return typeof window !== "undefined" && window.location.protocol === "https:";
}
