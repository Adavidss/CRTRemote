import type { AppDescriptor } from "@/protocol";
import { haptic } from "@/hooks/useHaptics.ts";
import { cn } from "@/utils/cn.ts";
import { appIcon, Icon } from "./ui/Icon.tsx";

/**
 * A launcher card.
 *
 * The tint comes from the descriptor's `hue`, which the host sends — so the
 * phone does not hold a table of which application is which colour, and a new
 * application arrives already looking like part of the set. Every hue is used
 * at the same saturation and lightness, which is what stops nine differently
 * coloured cards turning into a fruit salad.
 */
export function AppTile({
  app,
  active,
  onSelect,
  size = "lg",
}: {
  app: AppDescriptor;
  active?: boolean;
  onSelect: () => void;
  size?: "lg" | "sm";
}) {
  const disabled = !app.available;
  const tint = `hsl(${app.hue} 72% 62%)`;

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
        "pressable focus-ring card relative flex w-full overflow-hidden text-left",
        size === "lg" ? "flex-col gap-3 p-4" : "items-center gap-3 p-3",
        disabled && "opacity-45",
        active && "border-[var(--accent)]",
      )}
      style={
        {
          // A tint that only just reads — the card is still a dark card, and the
          // colour is an accent on it rather than the surface itself.
          backgroundImage: `radial-gradient(120% 90% at 0% 0%, ${tint}22 0%, transparent 62%)`,
        } as React.CSSProperties
      }
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-[14px]",
          size === "lg" ? "h-12 w-12" : "h-10 w-10",
        )}
        style={{ background: `${tint}1f`, color: tint }}
      >
        <Icon name={appIcon(app.icon)} size={size === "lg" ? 24 : 20} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={cn("block truncate font-semibold text-[var(--ink)]", size === "lg" ? "text-[17px]" : "text-[15px]")}>
            {app.title}
          </span>
          {active ? (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" aria-label="Running" />
          ) : null}
        </span>
        {/* `block` is deliberately only on the truncating branch: it sets
            `display: block`, which overrides the `-webkit-box` that
            `line-clamp` needs, and the clamp silently stops working. */}
        <span
          className={cn(
            "mt-0.5 text-[12px] text-[var(--ink-3)]",
            size === "lg" ? "line-clamp-2" : "block truncate",
          )}
        >
          {disabled ? (app.unavailableReason ?? "Unavailable") : app.description}
        </span>
      </span>

      {size === "sm" ? <Icon name="chevron-right" size={18} className="shrink-0 text-[var(--ink-4)]" /> : null}
    </button>
  );
}
