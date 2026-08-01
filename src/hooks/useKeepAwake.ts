import { useEffect } from "react";

/**
 * Hold a screen wake lock while the remote is open.
 *
 * A remote whose screen has gone dark is a remote you have to wake, unlock and
 * navigate before you can pause what is playing — which is slower than getting
 * up. The lock is released automatically when the tab is hidden, and has to be
 * re-taken on the way back, which is what the visibility listener is for.
 */
export function useKeepAwake(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    // Not available on iOS Safari before 16.4, and absent entirely in some
    // in-app browsers, so its absence is normal rather than an error.
    const api = (navigator as Navigator & { wakeLock?: { request(type: "screen"): Promise<WakeLockSentinel> } }).wakeLock;
    if (!api) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const lock = await api.request("screen");
        if (cancelled) {
          void lock.release();
          return;
        }
        sentinel = lock;
      } catch {
        // Denied — low battery, or the browser simply said no.
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !sentinel) void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release().catch(() => undefined);
      sentinel = null;
    };
  }, [enabled]);
}
