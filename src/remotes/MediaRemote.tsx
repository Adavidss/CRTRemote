import { useEffect, useState } from "react";
import type { HostState } from "@/protocol";
import { send } from "@/state/connection.ts";
import { Icon } from "@/components/ui/Icon.tsx";
import { EmptyState, PadButton } from "@/components/ui/controls.tsx";
import { formatDuration } from "@/utils/format.ts";
import { cn } from "@/utils/cn.ts";
import { haptic } from "@/hooks/useHaptics.ts";

/**
 * Transport controls.
 *
 * The scrubber is the one place a purely reactive UI falls down: while a finger
 * is on it the value has to follow the finger, or dragging feels like fighting
 * the host. So it holds a local value *during the drag only*, sends one seek on
 * release, and goes straight back to mirroring the host. That is a deliberate
 * and bounded exception, not a local model of playback.
 */
export function MediaRemote({ state }: { state: HostState }) {
  const media = state.media;
  const [scrubbing, setScrubbing] = useState<number | null>(null);

  // If the host moves the track under us, abandon any drag in progress rather
  // than seeking the new track to the old track's position.
  useEffect(() => {
    setScrubbing(null);
  }, [media.title]);

  if (!media.title) {
    return (
      <EmptyState
        icon="videos"
        title="Nothing is playing"
        detail="Start something from the Videos application and the controls will appear here."
      />
    );
  }

  const position = scrubbing ?? media.positionSeconds;
  const progress = media.durationSeconds > 0 ? position / media.durationSeconds : 0;

  return (
    <div className="flex flex-col gap-5">
      <section className="card p-4">
        <p className="t-label">{media.kind ?? "media"}</p>
        <p className="mt-1 truncate text-[20px] font-semibold">{media.title}</p>
        <p className="mt-0.5 text-[13px] text-[var(--ink-3)]">
          Track {media.index} of {media.count}
        </p>

        <div className="mt-4">
          <input
            type="range"
            min={0}
            max={Math.max(1, media.durationSeconds)}
            step={1}
            value={position}
            onChange={(event) => setScrubbing(Number(event.target.value))}
            onPointerUp={() => {
              if (scrubbing === null) return;
              haptic("select");
              send({ type: "media.control", action: "seek", value: scrubbing });
              setScrubbing(null);
            }}
            aria-label="Position"
            className="h-6 w-full cursor-pointer appearance-none bg-transparent
              [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-none [&::-webkit-slider-runnable-track]:bg-[var(--surface-3)]
              [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:bg-[var(--accent)]
              [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-none [&::-moz-range-track]:bg-[var(--surface-3)]
              [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:bg-[var(--accent)]"
            style={{
              background: `linear-gradient(to right, var(--accent) ${progress * 100}%, transparent ${progress * 100}%)`,
              backgroundSize: "100% 6px",
              backgroundPosition: "0 center",
              backgroundRepeat: "no-repeat",
            }}
          />
          <div className="flex justify-between text-[12px] text-[var(--ink-3)]">
            <span className="t-tabular">{formatDuration(position)}</span>
            <span className="t-tabular">{formatDuration(media.durationSeconds)}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-4">
          <RoundKey icon="previous" label="Previous" onPress={() => send({ type: "media.control", action: "previous" })} />
          <button
            type="button"
            aria-label={media.playing ? "Pause" : "Play"}
            onClick={() => {
              haptic("confirm");
              send({ type: "media.control", action: "toggle" });
            }}
            className="pressable focus-ring flex h-[68px] w-[68px] items-center justify-center rounded-none bg-[var(--accent)] text-[var(--accent-ink)]"
          >
            <Icon name={media.playing ? "pause" : "play"} size={28} filled={!media.playing} />
          </button>
          <RoundKey icon="next" label="Next" onPress={() => send({ type: "media.control", action: "next" })} />
        </div>
      </section>

      <section className="card p-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={media.muted ? "Unmute" : "Mute"}
            onClick={() => {
              haptic("tick");
              send({ type: "media.control", action: "mute" });
            }}
            className="pressable focus-ring text-[var(--ink-2)]"
          >
            <Icon name={media.muted ? "mute" : "volume"} size={20} />
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round((media.muted ? 0 : media.volume) * 100)}
            onChange={(event) =>
              send({ type: "media.control", action: "volume", value: Number(event.target.value) / 100 })
            }
            aria-label="Volume"
            className="h-6 flex-1 cursor-pointer appearance-none bg-transparent
              [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-none [&::-webkit-slider-runnable-track]:bg-[var(--surface-3)]
              [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:bg-[var(--ink)]
              [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-none [&::-moz-range-track]:bg-[var(--surface-3)]
              [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:bg-[var(--ink)]"
          />
          <span className="t-tabular w-9 text-right text-[12px] text-[var(--ink-3)]">
            {Math.round((media.muted ? 0 : media.volume) * 100)}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <PadButton
            icon="shuffle"
            label="Shuffle"
            active={media.shuffle}
            onPress={() => send({ type: "media.control", action: "shuffle" })}
            className="py-3"
          />
          <PadButton
            icon="repeat"
            label="Repeat"
            active={media.repeat}
            onPress={() => send({ type: "media.control", action: "repeat" })}
            className="py-3"
          />
          <PadButton
            icon="stop"
            label="Stop"
            onPress={() => send({ type: "media.control", action: "stop" })}
            className="py-3"
          />
        </div>
      </section>
    </div>
  );
}

function RoundKey({ icon, label, onPress }: { icon: "next" | "previous"; label: string; onPress: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        haptic("tick");
        onPress();
      }}
      className={cn(
        "pressable focus-ring flex h-14 w-14 items-center justify-center rounded-none border border-[var(--hairline)] bg-[var(--surface-2)] text-[var(--ink)]",
      )}
    >
      <Icon name={icon} size={22} />
    </button>
  );
}
