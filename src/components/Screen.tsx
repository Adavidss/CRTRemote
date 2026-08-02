import type { ReactNode } from "react";
import { haptic } from "@/hooks/useHaptics.ts";
import { cn } from "@/utils/cn.ts";
import { Icon } from "./ui/Icon.tsx";

/**
 * The page frame.
 *
 * One large title that is part of the scroll, a hairline that appears only once
 * you have scrolled past it, and everything inside the safe area. The layout is
 * fixed and only the middle scrolls, so the bottom bar never moves and a tap
 * always lands where the thumb expected it.
 */
export function Screen({
  title,
  subtitle,
  trailing,
  onBack,
  children,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  onBack?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="pt-safe shrink-0 px-5 pt-3">
        <div className="flex items-start gap-3 pt-2">
          {onBack ? (
            <button
              type="button"
              aria-label="Back"
              onClick={() => {
                haptic("tick");
                onBack();
              }}
              className="pressable focus-ring -ml-2 mt-1 flex h-9 w-9 items-center justify-center rounded-none text-[var(--ink-2)]"
            >
              <Icon name="chevron-left" size={22} />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            {/* Wraps rather than truncating: a host name is the one string on
                this screen the user chose themselves, and a monospace capital
                runs wide enough that "Simulated CRT" already clipped. */}
            <h1 className="t-display break-words">{title}</h1>
            {subtitle ? <div className="mt-1 text-[14px] text-[var(--ink-3)]">{subtitle}</div> : null}
          </div>
          {trailing ? <div className="mt-1 shrink-0">{trailing}</div> : null}
        </div>
      </header>

      <div className={cn("scroll-area min-h-0 flex-1 px-5 pt-4", className)}>
        {/* Clears the floating bar, which is taller than it looks once the
            home-indicator inset is added underneath it. */}
        <div className="animate-rise flex flex-col gap-5 pb-40">{children}</div>
      </div>
    </div>
  );
}
