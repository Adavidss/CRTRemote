/**
 * The application catalog as it appears on the wire.
 *
 * The host owns this list. The remote renders whatever it is handed and knows
 * nothing about what any given application actually does — that is what keeps
 * "add a new application" a one-repo change.
 */

export const BUILT_IN_APP_IDS = [
  "home",
  "clock",
  "animations",
  "games",
  "pet",
  "photos",
  "videos",
  "visualizer",
  "weather",
] as const;

export type BuiltInAppId = (typeof BUILT_IN_APP_IDS)[number];

/**
 * `string & {}` keeps autocomplete for the built-ins while still accepting an
 * id the remote has never heard of, so a host can ship a new application
 * without the remote needing a release.
 */
// oxlint-disable-next-line ban-types
export type AppId = BuiltInAppId | (string & {});

/** Which control surface the phone should show while an app is in front. */
export type RemoteSurfaceId =
  | "none"
  | "launcher"
  | "clock"
  | "games"
  | "pet"
  | "media"
  | "photos"
  | "visualizer"
  | "animations"
  | "weather"
  // oxlint-disable-next-line ban-types
  | (string & {});

export type AppCategory = "system" | "play" | "media" | "info";

export interface AppDescriptor {
  id: AppId;
  title: string;
  /** One short line. The CRT shows nothing this long; the phone does. */
  description: string;
  /**
   * Icon key. The remote maps known keys to artwork and falls back to the
   * app's initial for anything it does not recognise, so an unknown app still
   * renders as a proper tile.
   */
  icon: string;
  category: AppCategory;
  remote: RemoteSurfaceId;
  /** Listed but not launchable — shown dimmed with the reason. */
  available: boolean;
  unavailableReason?: string;
  /**
   * Accent hue in degrees. Supplied by the host so the phone's palette follows
   * the host's idea of the application rather than a hard-coded table.
   */
  hue: number;
  /** Hidden from the launcher grid (the home app itself, mostly). */
  hidden?: boolean;
}
