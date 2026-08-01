import { haptic } from "@/hooks/useHaptics.ts";
import { navigate, TABS, tabFor, useRoute } from "@/router.ts";
import { cn } from "@/utils/cn.ts";
import { appIcon, Icon } from "./ui/Icon.tsx";

/**
 * The bottom bar.
 *
 * Floating rather than pinned to the edge: it keeps clear of the home indicator
 * without a dead strip under it, and the blur behind gives the content
 * something to pass under so the page reads as continuous.
 */
export function BottomNav() {
  const route = useRoute();
  const active = tabFor(route.name);

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-safe">
      <div className="pointer-events-auto mx-4 mb-3 flex w-full max-w-md items-center gap-1 rounded-full border border-[var(--hairline)] bg-[color-mix(in_srgb,var(--surface)_78%,transparent)] p-1.5 shadow-[0_8px_32px_-8px_#000000cc] backdrop-blur-xl">
        {TABS.map((tab) => {
          const selected = tab.route === active;
          return (
            <button
              key={tab.route}
              type="button"
              aria-current={selected ? "page" : undefined}
              onClick={() => {
                if (!selected) haptic("select");
                navigate(tab.route);
              }}
              className={cn(
                "pressable focus-ring relative flex flex-1 flex-col items-center gap-0.5 rounded-full py-2",
                selected ? "text-[var(--accent)]" : "text-[var(--ink-3)]",
              )}
            >
              {/* The selected pill sits behind the icon so the transition is a
                  background moving, not the icon jumping. */}
              {selected ? (
                <span className="absolute inset-0 rounded-full bg-[var(--accent-soft)]" aria-hidden="true" />
              ) : null}
              <Icon name={appIcon(tab.icon)} size={21} className="relative" />
              <span className="relative text-[10px] font-medium tracking-wide">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
