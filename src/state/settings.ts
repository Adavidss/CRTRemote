import { createStore, useStore } from "@/utils/store.ts";

/**
 * The remote's own preferences — the only state this application owns.
 *
 * Everything about the CRT lives on the CRT. What is left is how this phone
 * should look and which host it should be pointed at, and that has to survive a
 * reload, so it goes to `localStorage` behind one small store.
 */

export const THEMES = ["phosphor", "amber", "ice", "magenta", "mono"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_LABELS: Record<Theme, string> = {
  phosphor: "Phosphor",
  amber: "Amber",
  ice: "Ice",
  magenta: "Magenta",
  mono: "Mono",
};

/** Maps a theme to the `data-theme` value the stylesheet keys off. */
const THEME_ATTRIBUTE: Record<Theme, string> = {
  phosphor: "phosphor",
  amber: "amber",
  ice: "ice",
  magenta: "magenta",
  mono: "mono",
};

export type ConnectionMode = "simulator" | "websocket" | "http";

export interface RemoteSettings {
  theme: Theme;
  connectionMode: ConnectionMode;
  /** Hostname or IP of the relay. `crt.local` if mDNS is working. */
  hostAddress: string;
  hostPort: number;
  /** Haptic feedback on every control that changes something. */
  haptics: boolean;
  /** Ask the browser to keep the screen on while the remote is open. */
  keepAwake: boolean;
  /** Show the live preview card on Home. */
  showPreviewOnHome: boolean;
}

const DEFAULTS: RemoteSettings = {
  theme: "phosphor",
  // Simulator by default: a fresh install has no Raspberry Pi to talk to, and
  // opening onto a connection error would be a poor first impression of a
  // system that works perfectly well on its own.
  connectionMode: "simulator",
  hostAddress: "crt.local",
  hostPort: 7890,
  haptics: true,
  keepAwake: true,
  showPreviewOnHome: true,
};

const STORAGE_KEY = "crtremote:settings";

function load(): RemoteSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<RemoteSettings>;
    // Merged rather than trusted: a settings blob written by an older build is
    // missing keys, and a missing key here means a screen renders undefined.
    return { ...DEFAULTS, ...parsed };
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
  document.documentElement.dataset.theme = THEME_ATTRIBUTE[theme];
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
