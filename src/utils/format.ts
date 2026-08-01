/** Formatting helpers, kept together so the same duration reads the same everywhere. */

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Compact age: "4m", "3h", "6d". */
export function formatAge(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86_400)}d`;
}

/** "just now", "4 min ago", "yesterday". */
export function formatRelative(timestamp: number | null, now = Date.now()): string {
  if (!timestamp) return "never";
  const seconds = Math.round((now - timestamp) / 1000);
  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)} h ago`;
  if (seconds < 172_800) return "yesterday";
  return `${Math.round(seconds / 86_400)} days ago`;
}

export function formatPlaytime(seconds: number): string {
  if (seconds < 60) return "under a minute";
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const hours = seconds / 3600;
  return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)} h`;
}

export function formatUptime(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ${minutes % 60} min`;
  return `${Math.floor(hours / 24)} d ${hours % 24} h`;
}

export const SYSTEM_LABELS: Record<string, string> = {
  gb: "Game Boy",
  gbc: "Game Boy Color",
  gba: "Game Boy Advance",
  nes: "NES",
  snes: "SNES",
  genesis: "Mega Drive",
  arcade: "Arcade",
  psx: "PlayStation",
  native: "Built-in",
};

/**
 * A stable pseudo-random number from a string.
 *
 * Used to generate cover art for games with no artwork. It matches the hash the
 * host uses for the same job, so a given title gets a recognisably related
 * cover on both screens rather than two unrelated ones.
 */
export function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // FNV-1a alone leaves the low bits poorly mixed for short strings: five of
  // the nine sample titles landed on the same `% 4`, and two pairs collided on
  // `% 360`, so half the library shared a cover. A murmur3 finalizer folds the
  // high bits down and makes every slice of the value independently usable.
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 2246822507);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 3266489909);
  hash ^= hash >>> 16;
  return hash >>> 0;
}
