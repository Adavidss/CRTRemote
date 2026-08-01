import type { AppDescriptor, CoreDescriptor, GameEntry, PaletteDescriptor } from "@/protocol";

/**
 * The data the simulated host serves.
 *
 * It mirrors what CRTHost publishes closely enough that the screens built
 * against it need no changes when a real host appears — same ids, same icon
 * keys, same hues, same shape of unavailable entry. Where it differs it does so
 * visibly: the games are the same catalogue placeholders CRTHost ships, and
 * they are unavailable for the same stated reason.
 */

export const SIM_APP_CATALOG: AppDescriptor[] = [
  {
    id: "home",
    title: "Home",
    description: "The application launcher.",
    icon: "home",
    category: "system",
    remote: "launcher",
    available: true,
    hue: 210,
    hidden: true,
  },
  {
    id: "clock",
    title: "Clock",
    description: "Three faces, a date, and nothing else.",
    icon: "clock",
    category: "system",
    remote: "clock",
    available: true,
    hue: 200,
  },
  {
    id: "games",
    title: "Games",
    description: "Built-in games and, when cores are installed, emulated ones.",
    icon: "games",
    category: "play",
    remote: "games",
    available: true,
    hue: 145,
  },
  {
    id: "pet",
    title: "Digital Pet",
    description: "A small creature that lives on the CRT and needs looking after.",
    icon: "pet",
    category: "play",
    remote: "pet",
    available: true,
    hue: 316,
  },
  {
    id: "animations",
    title: "Animations",
    description: "Generative scenes to leave running.",
    icon: "animations",
    category: "play",
    remote: "animations",
    available: true,
    hue: 268,
  },
  {
    id: "photos",
    title: "Photos",
    description: "A slideshow, dithered for the tube.",
    icon: "photos",
    category: "media",
    remote: "photos",
    available: true,
    hue: 32,
  },
  {
    id: "videos",
    title: "Videos",
    description: "Playback with full transport controls from the phone.",
    icon: "videos",
    category: "media",
    remote: "media",
    available: true,
    hue: 12,
  },
  {
    id: "visualizer",
    title: "Visualizer",
    description: "Spectrum, scope and mirror — driven by a synthesised signal.",
    icon: "visualizer",
    category: "media",
    remote: "visualizer",
    available: true,
    hue: 178,
  },
  {
    id: "weather",
    title: "Weather",
    description: "Current conditions and a five-day outlook.",
    icon: "weather",
    category: "info",
    remote: "weather",
    available: true,
    hue: 196,
  },
];

const placeholder = (id: string, title: string, system: GameEntry["system"]): GameEntry => ({
  id,
  title,
  system,
  cover: null,
  library: "published",
  playable: false,
  unavailableReason: "ROM not installed",
  lastPlayedAt: null,
  playSeconds: 0,
  hasSave: false,
});

export const SIM_GAMES: GameEntry[] = [
  {
    id: "native-beacon-run",
    title: "Beacon Run",
    system: "native",
    cover: null,
    library: "published",
    playable: true,
    lastPlayedAt: Date.now() - 1000 * 60 * 42,
    playSeconds: 1260,
    hasSave: true,
  },
  placeholder("cavern-diver", "Cavern Diver", "gb"),
  placeholder("turbo-circuit", "Turbo Circuit", "snes"),
  placeholder("night-patrol", "Night Patrol", "nes"),
  placeholder("sky-harbour", "Sky Harbour", "gba"),
  placeholder("iron-district", "Iron District", "genesis"),
  placeholder("quarter-up", "Quarter Up", "arcade"),
  placeholder("long-drive-home", "Long Drive Home", "psx"),
  placeholder("pocket-garden", "Pocket Garden", "gbc"),
];

export const SIM_CORES: CoreDescriptor[] = [
  { id: "native", system: "native", label: "Built-in", installed: true, provider: "native" },
  { id: "libretro:gambatte", system: "gb", label: "Game Boy", installed: false, provider: "libretro:gambatte" },
  { id: "libretro:mgba", system: "gba", label: "Game Boy Advance", installed: false, provider: "libretro:mgba" },
  { id: "libretro:mesen", system: "nes", label: "NES", installed: false, provider: "libretro:mesen" },
  { id: "libretro:snes9x", system: "snes", label: "SNES", installed: false, provider: "libretro:snes9x" },
  {
    id: "libretro:genesis_plus_gx",
    system: "genesis",
    label: "Mega Drive",
    installed: false,
    provider: "libretro:genesis_plus_gx",
  },
  { id: "libretro:fbneo", system: "arcade", label: "Arcade", installed: false, provider: "libretro:fbneo" },
  {
    id: "libretro:swanstation",
    system: "psx",
    label: "PlayStation",
    installed: false,
    provider: "libretro:swanstation",
  },
];

export const SIM_PALETTES: PaletteDescriptor[] = [
  { id: "p4-mono", label: "P4 Mono", monochrome: true, swatch: ["#131211", "#463f36", "#948c7e", "#fffbf4"] },
  { id: "p1-green", label: "P1 Green", monochrome: true, swatch: ["#0a1409", "#22462a", "#49954e", "#7eff94"] },
  { id: "p3-amber", label: "P3 Amber", monochrome: true, swatch: ["#130d05", "#462f12", "#957026", "#ffb042"] },
  { id: "p7-blue", label: "P7 Blue", monochrome: true, swatch: ["#0e1013", "#333b46", "#6d7e95", "#bad6ff" ] },
  { id: "ember", label: "Ember", monochrome: false, swatch: ["#1a0d20", "#6b1f3f", "#d75f3a", "#ffe9b8"] },
  { id: "seafoam", label: "Seafoam", monochrome: false, swatch: ["#04141c", "#14494a", "#39a07a", "#e2fff0"] },
];

export const SIM_CLOCK_FACES = [
  { id: "segments", label: "Segments" },
  { id: "analogue", label: "Analogue" },
  { id: "quiet", label: "Quiet" },
];
