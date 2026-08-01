import type { GameEntry } from "@/protocol";
import { haptic } from "@/hooks/useHaptics.ts";
import { cn } from "@/utils/cn.ts";
import { formatPlaytime, formatRelative, hashString, SYSTEM_LABELS } from "@/utils/format.ts";
import { Icon } from "./ui/Icon.tsx";

/**
 * A game, with generated cover art when it has none.
 *
 * A library of identical placeholder rectangles is unnavigable — you cannot
 * find the one you were just looking at. Deriving a pattern from the title
 * gives every entry a stable identity for free, and it is the same trick the
 * CRT uses, so a game looks recognisably like itself on both screens.
 */
export function GameCard({
  game,
  active,
  onPlay,
}: {
  game: GameEntry;
  active?: boolean;
  onPlay: () => void;
}) {
  const disabled = !game.playable;

  return (
    <div
      className={cn(
        "card flex gap-3 p-3",
        disabled && "opacity-60",
        active && "border-[var(--accent)]",
      )}
    >
      <Cover game={game} />

      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold text-[var(--ink)]">{game.title}</p>
          <p className="mt-0.5 truncate text-[12px] text-[var(--ink-3)]">
            {SYSTEM_LABELS[game.system] ?? game.system.toUpperCase()}
            {game.library === "user" ? " · Your library" : ""}
          </p>
          <p className="mt-1 truncate text-[11px] text-[var(--ink-4)]">
            {disabled
              ? (game.unavailableReason ?? "Unavailable")
              : game.lastPlayedAt
                ? `Played ${formatRelative(game.lastPlayedAt)} · ${formatPlaytime(game.playSeconds)}`
                : "Never played"}
          </p>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              haptic("confirm");
              onPlay();
            }}
            className={cn(
              "pressable focus-ring inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold",
              active
                ? "bg-[var(--surface-3)] text-[var(--ink)]"
                : "bg-[var(--accent)] text-[var(--accent-ink)]",
              disabled && "cursor-not-allowed bg-[var(--surface-3)] text-[var(--ink-4)]",
            )}
          >
            <Icon name={active ? "stop" : "play"} size={14} filled={!active} />
            {active ? "Stop" : "Play"}
          </button>
          {game.hasSave ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--ink-3)]">
              <Icon name="save" size={13} /> Saved
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * The cover. Four families of generated art, chosen by the title's hash, drawn
 * as SVG so they stay crisp at any size and cost no canvas work.
 */
export function Cover({ game, size = 76 }: { game: GameEntry; size?: number }) {
  if (game.cover) {
    return (
      <img
        src={game.cover}
        alt=""
        className="shrink-0 rounded-[12px] object-cover"
        style={{ width: size, height: size * 1.32, imageRendering: "pixelated" }}
      />
    );
  }

  const seed = hashString(game.title);
  // Different slices of the hash, so hue and pattern vary independently rather
  // than moving together.
  const hue = (seed >>> 8) % 360;
  const family = seed % 4;
  const ink = `hsl(${hue} 62% 68%)`;
  const back = `hsl(${hue} 34% 16%)`;

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-[12px] border border-[var(--hairline)]"
      style={{ width: size, height: size * 1.32, background: back }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 60 80" className="h-full w-full" preserveAspectRatio="none">
        {family === 0
          ? Array.from({ length: 10 }, (_, i) => (
              <rect key={i} x="0" y={i * 8} width="60" height={i % 2 ? 3 : 5} fill={ink} opacity={0.16 + (i % 3) * 0.1} />
            ))
          : family === 1
            ? Array.from({ length: 5 }, (_, i) => (
                <circle
                  key={i}
                  cx={10 + ((seed >> (i * 3)) % 40)}
                  cy={12 + ((seed >> (i * 2)) % 56)}
                  r={5 + ((seed >> i) % 13)}
                  fill="none"
                  stroke={ink}
                  strokeWidth="1.5"
                  opacity={0.55}
                />
              ))
            : family === 2
              ? Array.from({ length: 7 }, (_, i) => (
                  <rect
                    key={i}
                    x={3 + ((seed >> i) % 26)}
                    y={5 + i * 10}
                    width={8 + ((seed >> (i * 2)) % 26)}
                    height="5"
                    rx="1.5"
                    fill={ink}
                    opacity={0.3 + (i % 3) * 0.2}
                  />
                ))
              : Array.from({ length: 6 }, (_, i) => (
                  <path
                    key={i}
                    d={`M0 ${10 + i * 12} L60 ${2 + i * 13}`}
                    stroke={ink}
                    strokeWidth="1.2"
                    opacity={0.45}
                    fill="none"
                  />
                ))}
      </svg>

      <span className="absolute inset-x-0 bottom-0 truncate bg-black/65 px-1.5 py-1 text-[9px] font-semibold tracking-wide text-white/90 backdrop-blur-sm">
        {game.title.split(" ")[0].toUpperCase()}
      </span>

      {!game.playable ? (
        <span className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-[var(--ink-3)]">
          <Icon name="close" size={10} />
        </span>
      ) : null}
    </div>
  );
}
