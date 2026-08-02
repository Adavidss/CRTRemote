import { connection, useConnection } from "@/state/connection.ts";
import { cn } from "@/utils/cn.ts";
import { Icon, type IconName } from "./ui/Icon.tsx";

const ICONS: Record<string, IconName> = {
  info: "info",
  success: "check",
  warn: "info",
  error: "close",
};

/**
 * Messages from the host.
 *
 * They sit above the bottom bar rather than at the top of the screen: the
 * user's attention and thumb are both at the bottom of a remote, and a banner
 * under the notch is something you find out about later.
 */
export function Toasts() {
  const { notices } = useConnection();
  if (notices.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[92px] z-50 flex flex-col items-center gap-2 px-5 pb-safe">
      {notices.map((notice) => (
        <button
          key={notice.id}
          type="button"
          onClick={() => connection.dismissNotice(notice.id)}
          className={cn(
            "animate-rise pointer-events-auto flex max-w-md items-center gap-2.5 rounded-none border border-[var(--hairline)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] px-4 py-2.5 text-[13px]",
            notice.level === "error" && "text-[var(--danger)]",
            notice.level === "warn" && "text-[var(--warn)]",
            notice.level === "success" && "text-[var(--accent)]",
            notice.level === "info" && "text-[var(--ink)]",
          )}
        >
          <Icon name={ICONS[notice.level] ?? "info"} size={16} />
          <span className="text-left">{notice.message}</span>
        </button>
      ))}
    </div>
  );
}
