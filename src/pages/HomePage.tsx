import { navigate } from "@/router.ts";
import { send, useConnection } from "@/state/connection.ts";
import { useSettings } from "@/state/settings.ts";
import { AppTile } from "@/components/AppTile.tsx";
import { ConnectionPill } from "@/components/ConnectionPill.tsx";
import { PreviewCard } from "@/components/PreviewCard.tsx";
import { Screen } from "@/components/Screen.tsx";
import { Button, EmptyState, Pill, Spinner } from "@/components/ui/controls.tsx";
import { appIcon, Icon } from "@/components/ui/Icon.tsx";
import { formatUptime } from "@/utils/format.ts";

/**
 * Home answers three questions and gets out of the way: is it connected, what
 * is it doing, and what would I like it to do instead.
 */
export function HomePage() {
  const { state, transport, protocolMismatch } = useConnection();
  const settings = useSettings();

  if (!state) {
    return (
      <Screen title="CRT" trailing={<ConnectionPill />}>
        {transport?.status === "connecting" || transport?.status === "reconnecting" ? (
          <div className="flex flex-col items-center gap-3 py-16 text-[var(--ink-3)]">
            <Spinner size={22} />
            <p className="text-[14px]">Looking for the CRT…</p>
          </div>
        ) : (
          <EmptyState
            icon="tv"
            title="Not connected"
            detail="Choose how this remote should reach the CRT, or switch on the simulator to explore without one."
            action={
              <Button tone="accent" icon="settings" onClick={() => navigate("settings")}>
                Open settings
              </Button>
            }
          />
        )}
      </Screen>
    );
  }

  const active = state.apps.catalog.find((app) => app.id === state.apps.activeAppId);
  const computerMode = state.display.mode === "computer";
  const recent = state.apps.recentAppIds
    .map((id) => state.apps.catalog.find((app) => app.id === id))
    .filter((app): app is NonNullable<typeof app> => Boolean(app) && !app!.hidden)
    .slice(0, 3);

  return (
    <Screen
      title={state.identity.name}
      subtitle={`${state.identity.model} · up ${formatUptime(state.time.uptimeMs)}`}
      trailing={<ConnectionPill />}
    >
      {protocolMismatch ? (
        <p className="rounded-[var(--radius)] border border-[var(--warn)]/30 bg-[var(--warn)]/8 px-4 py-3 text-[13px] text-[var(--warn)]">
          {protocolMismatch} Some controls may not work until both are updated.
        </p>
      ) : null}

      {/* What's on now */}
      <section className="card p-4">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center border border-[var(--hairline)] ${
              computerMode
                ? "bg-[var(--surface-3)] text-[var(--ink-2)]"
                : "bg-[var(--surface-2)] text-[var(--accent)]"
            }`}
          >
            <Icon name={computerMode ? "monitor" : appIcon(active?.icon ?? "tv")} size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="t-label">On screen now</p>
            <p className="truncate text-[18px] font-semibold">
              {computerMode ? "Computer display" : (active?.title ?? "Launcher")}
            </p>
            {state.apps.statusLine && !computerMode ? (
              <p className="truncate text-[13px] text-[var(--ink-3)]">{state.apps.statusLine}</p>
            ) : null}
          </div>
          {!computerMode && active?.remote !== "none" ? (
            <Button size="sm" onClick={() => navigate("remote")}>
              Control
            </Button>
          ) : null}
        </div>

        {computerMode ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--hairline)] bg-[var(--bg-2)] px-3 py-2.5">
            <p className="text-[13px] text-[var(--ink-2)]">Remote controls are disabled while mirroring.</p>
            <Button
              size="sm"
              tone="accent"
              onClick={() => send({ type: "display.setMode", mode: "remote" })}
            >
              Take back
            </Button>
          </div>
        ) : null}
      </section>

      {settings.showPreviewOnHome ? <PreviewCard /> : null}

      {recent.length > 0 && !computerMode ? (
        <section>
          <p className="t-label mb-2 px-1">Recent</p>
          <div className="flex flex-col gap-2">
            {recent.map((app) => (
              <AppTile
                key={app.id}
                app={app}
                size="sm"
                active={app.id === state.apps.activeAppId}
                onSelect={() => send({ type: "app.launch", appId: app.id })}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-wrap items-center gap-2">
        <Pill tone="muted">
          <Icon name="tv" size={13} />
          {state.display.width}×{state.display.height}
        </Pill>
        <Pill tone="muted">{state.display.palettes.find((p) => p.id === state.display.paletteId)?.label ?? state.display.paletteId}</Pill>
        <Pill tone={computerMode ? "warn" : "accent"}>{computerMode ? "Passthrough" : "CRT apps"}</Pill>
        {settings.connectionMode === "simulator" ? <Pill tone="warn">Simulated host</Pill> : null}
      </section>
    </Screen>
  );
}
