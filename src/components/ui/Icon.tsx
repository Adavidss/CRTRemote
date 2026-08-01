/**
 * The icon set.
 *
 * Hand-drawn rather than pulled from a library, for two reasons. An icon pack
 * brings its own visual voice and this interface is meant to have one of its
 * own — and half of these (a CRT, a D-pad, a digital pet) do not exist in any
 * pack anyway. Every glyph is one 24×24 stroke drawing at the same weight, so
 * they sit together the way a designed set does.
 */

export type IconName =
  | "home"
  | "grid"
  | "remote"
  | "settings"
  | "info"
  | "clock"
  | "games"
  | "pet"
  | "animations"
  | "photos"
  | "videos"
  | "visualizer"
  | "weather"
  | "tv"
  | "monitor"
  | "play"
  | "pause"
  | "stop"
  | "next"
  | "previous"
  | "volume"
  | "mute"
  | "shuffle"
  | "repeat"
  | "save"
  | "power"
  | "refresh"
  | "eye"
  | "eye-off"
  | "chevron-right"
  | "chevron-left"
  | "chevron-down"
  | "check"
  | "close"
  | "plus"
  | "minus"
  | "link"
  | "hand"
  | "bowl"
  | "sparkle"
  | "ball"
  | "cube"
  | "speech"
  | "moon"
  | "sun"
  | "heart"
  | "bolt";

const PATHS: Record<IconName, React.ReactNode> = {
  home: <path d="M4 11.2 12 4l8 7.2V19a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z" />,
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="2" />
      <rect x="13" y="4" width="7" height="7" rx="2" />
      <rect x="4" y="13" width="7" height="7" rx="2" />
      <rect x="13" y="13" width="7" height="7" rx="2" />
    </>
  ),
  remote: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="3.5" />
      <circle cx="12" cy="7.5" r="1.6" />
      <path d="M9.5 13h5M9.5 16.5h5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.2M12 18.8V21M4.2 7.5l1.9 1.1M17.9 15.4l1.9 1.1M4.2 16.5l1.9-1.1M17.9 8.6l1.9-1.1" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="7.9" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.2V12l3.4 2" />
    </>
  ),
  games: (
    <>
      <rect x="2.5" y="7" width="19" height="10" rx="4" />
      <path d="M7 10v4M5 12h4M15.5 11.4h.01M17.8 13.2h.01" />
    </>
  ),
  pet: (
    <>
      <path d="M5.5 15a6.5 6.5 0 0 1 13 0v2a3 3 0 0 1-3 3h-7a3 3 0 0 1-3-3z" />
      <path d="M7.5 9.5 6 5.5l3.2 2M16.5 9.5 18 5.5l-3.2 2" />
      <circle cx="9.8" cy="14" r=".9" fill="currentColor" stroke="none" />
      <circle cx="14.2" cy="14" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  animations: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.6 5.6l1.9 1.9M16.5 16.5l1.9 1.9M18.4 5.6l-1.9 1.9M7.5 16.5l-1.9 1.9" />
    </>
  ),
  photos: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="3" />
      <path d="M3.5 16.5 8.5 12l3.5 3 3-2.5 5.5 4.5" />
      <circle cx="8.2" cy="9.2" r="1.3" />
    </>
  ),
  videos: (
    <>
      <rect x="2.5" y="5" width="14" height="14" rx="3" />
      <path d="M16.5 10.5 21.5 7.5v9l-5-3z" />
    </>
  ),
  visualizer: <path d="M4 14v-4M8 18V6M12 15.5v-7M16 19V5M20 13.5v-3" />,
  weather: (
    <>
      <path d="M7.5 18.5h9a3.8 3.8 0 0 0 .3-7.6 5.3 5.3 0 0 0-10.2-1A3.9 3.9 0 0 0 7.5 18.5z" />
    </>
  ),
  tv: (
    <>
      <rect x="2.5" y="5" width="19" height="13" rx="3" />
      <path d="M8.5 21h7M9 2.5 12 5l3-2.5" />
    </>
  ),
  monitor: (
    <>
      <rect x="2.5" y="4" width="19" height="12.5" rx="2.5" />
      <path d="M9 20.5h6M12 16.5v4" />
    </>
  ),
  play: <path d="M8 5.5 18.5 12 8 18.5z" strokeLinejoin="round" />,
  pause: <path d="M9 5.5v13M15 5.5v13" />,
  stop: <rect x="6.5" y="6.5" width="11" height="11" rx="2" />,
  next: <path d="M6 5.5 15 12l-9 6.5zM18 5.5v13" />,
  previous: <path d="M18 5.5 9 12l9 6.5zM6 5.5v13" />,
  volume: (
    <>
      <path d="M4.5 9.5h3L12 6v12l-4.5-3.5h-3z" strokeLinejoin="round" />
      <path d="M15.5 9.8a3.2 3.2 0 0 1 0 4.4M18 7.5a6.6 6.6 0 0 1 0 9" />
    </>
  ),
  mute: (
    <>
      <path d="M4.5 9.5h3L12 6v12l-4.5-3.5h-3z" strokeLinejoin="round" />
      <path d="M16 10l4 4M20 10l-4 4" />
    </>
  ),
  shuffle: <path d="M3.5 6.5h3l9 11h5M3.5 17.5h3l9-11h5M17.5 3.5 20.5 6.5 17.5 9.5M17.5 14.5l3 3-3 3" />,
  repeat: <path d="M6.5 4.5h11a3 3 0 0 1 3 3v3M17.5 19.5h-11a3 3 0 0 1-3-3v-3M6 1.5 3.5 4.5 6 7.5M18 16.5l2.5 3-2.5 3" />,
  save: (
    <>
      <path d="M5 4.5h11l3 3V18a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18z" />
      <path d="M8.5 4.5v5h6v-5M8 19.5v-5h8v5" />
    </>
  ),
  power: <path d="M12 3.5v8M7.2 6.4a7.5 7.5 0 1 0 9.6 0" />,
  refresh: <path d="M20 12a8 8 0 1 1-2.6-5.9M20.5 3.5v5h-5" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  "eye-off": (
    <>
      <path d="M4 4.5 20 19.5" />
      <path d="M9.6 6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.8M6.2 8.3A17.6 17.6 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 3-.5" />
    </>
  ),
  "chevron-right": <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  "chevron-left": <path d="M14.5 5.5 8 12l6.5 6.5" />,
  "chevron-down": <path d="M5.5 9.5 12 16l6.5-6.5" />,
  check: <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  minus: <path d="M5.5 12h13" />,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3A4 4 0 0 0 13 5.3l-1.7 1.7M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1.7-1.7" />,
  hand: <path d="M8 12V6.2a1.6 1.6 0 0 1 3.2 0V11m0-.5V5.2a1.6 1.6 0 0 1 3.2 0V11m0-.8a1.6 1.6 0 0 1 3.2 0v4.6a5.5 5.5 0 0 1-5.5 5.5h-1a5 5 0 0 1-4.2-2.3L4.6 15a1.6 1.6 0 0 1 2.6-1.8L8 14.2" />,
  bowl: (
    <>
      <path d="M3.5 11.5h17a8.5 8.5 0 0 1-8.5 8 8.5 8.5 0 0 1-8.5-8z" />
      <path d="M9 8.5c0-1.5 1.5-1.5 1.5-3M14 8.5c0-1.5 1.5-1.5 1.5-3" />
    </>
  ),
  sparkle: <path d="M12 3.5 13.8 9.3 19.5 11 13.8 12.7 12 18.5 10.2 12.7 4.5 11 10.2 9.3zM18.5 16.5l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7z" strokeLinejoin="round" />,
  ball: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.6 12c3.5 0 6.5 2.5 7.5 8.3M20.4 12c-3.5 0-6.5 2.5-7.5 8.3M12 3.5c0 3.5 2.6 6.4 6.5 7.5" />
    </>
  ),
  cube: (
    <>
      <path d="M12 3.5 20 8v8l-8 4.5L4 16V8z" strokeLinejoin="round" />
      <path d="M4 8l8 4.5L20 8M12 12.5v8" />
    </>
  ),
  speech: <path d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-6L7 19.5V15.5h-.5a2 2 0 0 1-2-2z" strokeLinejoin="round" />,
  moon: <path d="M20 14.2A8.5 8.5 0 1 1 9.8 4a6.8 6.8 0 0 0 10.2 10.2z" strokeLinejoin="round" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
    </>
  ),
  heart: <path d="M12 20s-7.5-4.3-7.5-9.4A4.1 4.1 0 0 1 12 8.1a4.1 4.1 0 0 1 7.5 2.5C19.5 15.7 12 20 12 20z" strokeLinejoin="round" />,
  bolt: <path d="M13.5 2.5 5 13.5h6L10.5 21.5 19 10.5h-6z" strokeLinejoin="round" />,
};

export interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  /** Fill instead of stroke — used by the play triangle at small sizes. */
  filled?: boolean;
}

export function Icon({ name, size = 22, className, filled }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={1.7}
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

/** Maps an app descriptor's icon key onto this set, with a sane fallback. */
export function appIcon(key: string): IconName {
  return (key in PATHS ? key : "grid") as IconName;
}
