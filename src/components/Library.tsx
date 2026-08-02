import { haptic } from "@/hooks/useHaptics.ts";
import { cn } from "@/utils/cn.ts";

/**
 * The list, laid out the way CRT Companion lays out its library — and the way
 * the CRT itself now lays out its launcher.
 *
 * Name on the left, kind on the right, one inverted bar, rules top and bottom.
 * The phone showing a wall of pictorial cards while the screen it controls
 * shows a ruled list made them look like two products; this is the same object
 * seen from two places.
 *
 * Two things are deliberately *not* copied, because a remote is not a CRT:
 *
 *  - Rows are tall enough to hit with a thumb rather than 11 pixels. The
 *    proportions carry the look; the pitch cannot.
 *  - The inverted bar means "this is what is on the screen right now", not
 *    "this is where a cursor is". There is no cursor here — you tap the thing
 *    you want — so the highlight is free to carry the more useful fact, and it
 *    means the phone always shows what the television is doing.
 */

export interface LibraryTab {
  id: string;
  label: string;
}

/**
 * What each category is called in the right-hand column, matching the CRT's own
 * launcher exactly — the two screens must not have different words for the same
 * thing. An unknown category falls back to its raw id rather than vanishing.
 */
export const CATEGORY_LABELS: Record<string, string> = {
  play: "PLAY",
  media: "MEDIA",
  info: "INFO",
  system: "SYSTEM",
};

export function LibraryTabs({
  tabs,
  active,
  onSelect,
  shown,
  total,
}: {
  tabs: LibraryTab[];
  active: string;
  onSelect: (id: string) => void;
  /** The `N/M` readout sits on this row, as it does on the CRT. */
  shown?: number;
  total?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      {/* Scrolls sideways rather than wrapping: a second row of chips pushes
          the list itself below the fold on a small phone. */}
      <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-1.5">
          {tabs.map((tab) => {
            const selected = tab.id === active;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  haptic("tick");
                  onSelect(tab.id);
                }}
                className={cn(
                  "focus-ring shrink-0 border px-3 py-1.5 text-[12px] font-bold tracking-[0.14em] uppercase transition",
                  selected
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]"
                    : "border-[var(--hairline)] text-[var(--ink-3)]",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      {shown !== undefined && total !== undefined ? (
        <LibraryCount shown={shown} total={total} />
      ) : null}
    </div>
  );
}

/** Rules top and bottom, nothing between: the pitch separates the rows. */
export function LibraryList({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-y border-[var(--hairline)]">
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

export function LibraryRow({
  title,
  kind,
  detail,
  active,
  disabled,
  onSelect,
}: {
  title: string;
  kind?: string;
  detail?: string;
  /** Running on the CRT right now — this is what the inverted bar means. */
  active?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-current={active ? "true" : undefined}
      onClick={() => {
        haptic("select");
        onSelect();
      }}
      className={cn(
        "focus-ring w-full px-3 py-3 text-left transition",
        active ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "text-[var(--ink)]",
        disabled && "opacity-40",
        // No `pressable`: it inverts on press, which is what `active` already
        // means here, and a row that flashes "running" while you tap it is a
        // lie for as long as the finger is down.
        !active && !disabled && "active:bg-[var(--surface-2)]",
      )}
    >
      <span className="flex items-baseline gap-3">
        <span className="w-3 shrink-0 text-[13px]">{active ? "►" : ""}</span>
        <span className="min-w-0 flex-1 truncate text-[15px] font-bold tracking-[0.06em] uppercase">
          {title}
        </span>
        {kind ? (
          <span
            className={cn(
              "shrink-0 text-[11px] font-bold tracking-[0.14em] uppercase",
              active ? "text-[var(--accent-ink)]" : "text-[var(--ink-4)]",
            )}
          >
            {kind}
          </span>
        ) : null}
      </span>
      {detail ? (
        <span
          className={cn(
            "mt-0.5 block truncate pl-6 text-[12px]",
            active ? "text-[var(--accent-ink)] opacity-70" : "text-[var(--ink-3)]",
          )}
        >
          {detail}
        </span>
      ) : null}
    </button>
  );
}

/** `8/8` — the same readout the CRT shows, in the same place. */
export function LibraryCount({ shown, total }: { shown: number; total: number }) {
  return (
    <span className="t-mono text-[13px] text-[var(--ink-3)]">
      {shown}/{total}
    </span>
  );
}
