import { isPending, type ConnectionStatus } from "@/protocol";
import { navigate } from "@/router.ts";
import { useConnection } from "@/state/connection.ts";
import { useSettings } from "@/state/settings.ts";
import { cn } from "@/utils/cn.ts";
import { haptic } from "@/hooks/useHaptics.ts";

/**
 * Connection state, everywhere.
 *
 * The one thing that must never be ambiguous on a remote control is whether it
 * is actually attached to anything — a button that does nothing because the
 * link is down looks exactly like a button that does nothing because it is
 * broken. It is a control, not a label: tapping it goes to the settings that
 * fix it.
 */
export function ConnectionPill({ compact }: { compact?: boolean }) {
  const { transport, identity } = useConnection();
  const settings = useSettings();
  const status: ConnectionStatus = transport?.status ?? "idle";
  const simulated = settings.connectionMode === "simulator";

  const tone =
    status === "connected"
      ? simulated
        ? "text-[var(--warn)]"
        : "text-[var(--accent)]"
      : isPending(status)
        ? "text-[var(--ink-2)]"
        : "text-[var(--danger)]";

  const label = (() => {
    if (status === "connected") return simulated ? "Simulated" : (identity?.name ?? "Connected");
    if (status === "connecting") return "Connecting";
    if (status === "reconnecting") return "Reconnecting";
    if (status === "error") return "Error";
    if (status === "disconnected") return "Offline";
    return "Idle";
  })();

  return (
    <button
      type="button"
      onClick={() => {
        haptic("tick");
        navigate("settings");
      }}
      className={cn(
        "pressable focus-ring inline-flex items-center gap-2 rounded-none border border-[var(--hairline)] bg-[var(--surface-2)] px-3 py-1.5",
        compact && "px-2.5 py-1",
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-none",
          status === "connected"
            ? simulated
              ? "bg-[var(--warn)]"
              : "bg-[var(--accent)]"
            : isPending(status)
              ? "animate-pulse-dot bg-[var(--ink-2)]"
              : "bg-[var(--danger)]",
        )}
      />
      <span className={cn("text-[12px] font-medium", tone)}>{label}</span>
      {transport?.latencyMs !== null && transport?.latencyMs !== undefined && status === "connected" && !simulated ? (
        <span className="t-tabular text-[11px] text-[var(--ink-4)]">{transport.latencyMs}ms</span>
      ) : null}
    </button>
  );
}
