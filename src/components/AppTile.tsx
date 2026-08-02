import type { AppDescriptor } from "@/protocol";
import { haptic } from "@/hooks/useHaptics.ts";
import { cn } from "@/utils/cn.ts";
import { appIcon, Icon } from "./ui/Icon.tsx";

/**
 * A launcher card.
 *
 * The descriptor carries a `hue`, and this used to tint each card with it. It
 * is deliberately ignored. The set on the end of the cable is monochrome, so
 * the host draws every one of these icons as a step on a brightness ramp — and
 * a phone showing nine differently coloured cards for the eight things that are
 * all one colour on the actual screen is not a remote for that screen. Apps are
 * told apart by their glyph and their name, which is how they are told apart on
 * the tube. `hue` stays in the protocol for a colour set later.
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
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center border border-[var(--hairline)] bg-[var(--surface-2)] text-[var(--accent)]",
          size === "lg" ? "h-12 w-12" : "h-10 w-10",
        )}
      >
        <Icon name={appIcon(app.icon)} size={size === "lg" ? 24 : 20} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={cn("block truncate font-semibold text-[var(--ink)]", size === "lg" ? "text-[17px]" : "text-[15px]")}>
            {app.title}
          </span>
          {active ? (
            <span className="h-1.5 w-1.5 shrink-0 rounded-none bg-[var(--accent)]" aria-label="Running" />
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
