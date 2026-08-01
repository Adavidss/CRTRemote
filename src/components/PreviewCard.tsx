import { useEffect, useState } from "react";
import type { PreviewMode } from "@/protocol";
import { send, useConnection } from "@/state/connection.ts";
import { cn } from "@/utils/cn.ts";
import { Icon } from "./ui/Icon.tsx";
import { Segmented } from "./ui/controls.tsx";

/**
 * The live view of the tube.
 *
 * Off by default and explicit about it: previews cost the host real work, and a
 * feature that quietly makes the CRT stutter is worse than one you have to
 * switch on. When it is running, a stalled feed is called out — a still image
 * that is simply the last frame received looks identical to a working preview
 * of a static screen, and those are very different situations.
 */
export function PreviewCard({ showControls = true }: { showControls?: boolean }) {
  const { state, preview } = useConnection();
  const [stale, setStale] = useState(false);

  const mode = state?.preview.mode ?? "off";
  const available = state?.preview.available ?? false;

  useEffect(() => {
    if (mode === "off" || !preview) {
      setStale(false);
      return;
    }
    setStale(false);
    // Two intervals without a frame is a stall worth mentioning; one is just
    // ordinary jitter on a busy network.
    const window = (state?.preview.intervalMs ?? 2000) * 2 + 1500;
    const timer = setTimeout(() => setStale(true), window);
    return () => clearTimeout(timer);
  }, [preview, mode, state?.preview.intervalMs]);

  return (
    <section className="card overflow-hidden">
      <div className="relative aspect-[4/3] w-full bg-black">
        {mode !== "off" && preview ? (
          <img
            src={preview.image}
            alt="Live view of the CRT"
            className={cn(
              "h-full w-full object-contain transition-opacity duration-300",
              stale && "opacity-45",
            )}
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[var(--ink-4)]">
            <Icon name={available ? "eye-off" : "monitor"} size={26} />
            <p className="text-[12px]">
              {!available
                ? "Unavailable in computer display mode"
                : mode === "off"
                  ? "Preview is off"
                  : "Waiting for the first frame…"}
            </p>
          </div>
        )}

        {/* Bottom-right: the CRT puts its own titles top-left and its hint bar
            bottom-left, so this is the one corner a badge never covers. */}
        {stale && mode !== "off" ? (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-2.5 py-1 text-[11px] text-[var(--warn)] backdrop-blur">
            Feed stalled
          </span>
        ) : null}

        {mode !== "off" && preview && !stale ? (
          <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] text-[var(--ink-2)] backdrop-blur">
            <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            Live
          </span>
        ) : null}
      </div>

      {showControls ? (
        <div className="p-3">
          <Segmented<PreviewMode>
            options={[
              { value: "off", label: "Off" },
              { value: "low", label: "Low" },
              { value: "high", label: "High", disabled: !available },
            ]}
            value={mode}
            onChange={(next) => send({ type: "preview.configure", mode: next })}
          />
          <p className="mt-2 px-1 text-[11px] text-[var(--ink-4)]">
            {mode === "off"
              ? "The CRT does no extra work while this is off."
              : `Refreshing about every ${Math.round((state?.preview.intervalMs ?? 0) / 100) / 10}s.`}
          </p>
        </div>
      ) : null}
    </section>
  );
}
