import { useCallback } from "react";
import { settingsStore } from "@/state/settings.ts";

/**
 * Haptic feedback.
 *
 * A remote control is the one kind of interface where the user is looking at
 * something else — the television — while operating it. A short tick is what
 * replaces the visual confirmation they are not looking at.
 *
 * `navigator.vibrate` is unsupported on iOS Safari, so on an iPhone this is a
 * no-op. It is still worth having: it works on Android, it costs nothing, and
 * the API is the same if iOS ever ships it.
 */

export type HapticKind = "tick" | "select" | "confirm" | "warn";

const PATTERNS: Record<HapticKind, number | number[]> = {
  tick: 8,
  select: 14,
  confirm: [10, 40, 18],
  warn: [26, 60, 26],
};

export function haptic(kind: HapticKind = "tick"): void {
  if (!settingsStore.get().haptics) return;
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    // Some browsers throw when the page is not visible. Nothing to do about it.
  }
}

export function useHaptics(): (kind?: HapticKind) => void {
  return useCallback((kind: HapticKind = "tick") => haptic(kind), []);
}
