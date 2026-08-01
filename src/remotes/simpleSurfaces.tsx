import type { HostState } from "@/protocol";
import { send } from "@/state/connection.ts";
import { Button, PadButton, Row, RowGroup, Toggle } from "@/components/ui/controls.tsx";
import { Icon } from "@/components/ui/Icon.tsx";
import { formatRelative } from "@/utils/format.ts";
import { DirectionalPad } from "./DirectionalPad.tsx";

/**
 * The smaller control surfaces.
 *
 * Each of these is a handful of controls over the same D-pad, so they live
 * together rather than in eight nearly-empty files. Anything that grows past a
 * screenful should move out to its own — Pet, Games and Media already have.
 */

export function LauncherRemote() {
  return (
    <div className="flex flex-col gap-5">
      <section className="card p-4">
        <DirectionalPad />
      </section>
      <p className="px-1 text-[12px] text-[var(--ink-4)]">
        The CRT is on its launcher. Applications can also be opened directly from the Apps tab.
      </p>
    </div>
  );
}

export function ClockRemote({ state }: { state: HostState }) {
  const clock = state.clock;
  return (
    <div className="flex flex-col gap-5">
      <section className="card p-5 text-center">
        <p className="t-display t-tabular">
          {new Date(state.time.epochMs).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
            second: clock.showSeconds ? "2-digit" : undefined,
            hour12: !clock.format24h,
          })}
        </p>
        <p className="mt-1 text-[13px] text-[var(--ink-3)]">{clock.timezone}</p>
      </section>

      <RowGroup label="Face">
        {clock.faces.map((face) => (
          <Row
            key={face.id}
            label={face.label}
            onClick={() => send({ type: "clock.configure", patch: { faceId: face.id } })}
          >
            {clock.faceId === face.id ? <Icon name="check" size={18} className="text-[var(--accent)]" /> : null}
          </Row>
        ))}
      </RowGroup>

      <RowGroup label="Display">
        <Row label="24-hour clock">
          <Toggle
            checked={clock.format24h}
            onChange={(next) => send({ type: "clock.configure", patch: { format24h: next } })}
            label="24-hour clock"
          />
        </Row>
        <Row label="Show seconds">
          <Toggle
            checked={clock.showSeconds}
            onChange={(next) => send({ type: "clock.configure", patch: { showSeconds: next } })}
            label="Show seconds"
          />
        </Row>
        <Row label="Show date">
          <Toggle
            checked={clock.showDate}
            onChange={(next) => send({ type: "clock.configure", patch: { showDate: next } })}
            label="Show date"
          />
        </Row>
      </RowGroup>
    </div>
  );
}

export function PhotosRemote({ state }: { state: HostState }) {
  return (
    <div className="flex flex-col gap-5">
      <section className="card p-4">
        <p className="t-label">Now showing</p>
        <p className="mt-1 truncate text-[17px] font-semibold">{state.apps.statusLine ?? "Slideshow"}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <PadButton
            icon="chevron-left"
            label="Previous"
            onPress={() => send({ type: "input.button", button: "left", phase: "press" })}
            className="py-4"
          />
          <PadButton
            icon="pause"
            label="Hold"
            onPress={() => send({ type: "input.button", button: "a", phase: "press" })}
            className="py-4"
          />
          <PadButton
            icon="chevron-right"
            label="Next"
            onPress={() => send({ type: "input.button", button: "right", phase: "press" })}
            className="py-4"
          />
        </div>
      </section>
      <p className="px-1 text-[12px] text-[var(--ink-4)]">
        Photographs are dithered into eight levels on the way to the tube.
      </p>
    </div>
  );
}

export function AnimationsRemote({ state }: { state: HostState }) {
  return (
    <div className="flex flex-col gap-5">
      <section className="card p-4">
        <p className="t-label">Scene</p>
        <p className="mt-1 truncate text-[17px] font-semibold">{state.apps.statusLine ?? "—"}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <PadButton
            icon="chevron-left"
            label="Previous"
            onPress={() => send({ type: "input.button", button: "left", phase: "press" })}
            className="py-4"
          />
          <PadButton
            icon="repeat"
            label="Auto/Hold"
            onPress={() => send({ type: "input.button", button: "a", phase: "press" })}
            className="py-4"
          />
          <PadButton
            icon="chevron-right"
            label="Next"
            onPress={() => send({ type: "input.button", button: "right", phase: "press" })}
            className="py-4"
          />
        </div>
      </section>
    </div>
  );
}

export function VisualizerRemote({ state }: { state: HostState }) {
  return (
    <section className="card p-4">
      <p className="t-label">Mode</p>
      <p className="mt-1 truncate text-[17px] font-semibold capitalize">{state.apps.statusLine ?? "—"}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <PadButton
          icon="chevron-left"
          label="Previous"
          onPress={() => send({ type: "input.button", button: "left", phase: "press" })}
          className="py-4"
        />
        <PadButton
          icon="chevron-right"
          label="Next"
          onPress={() => send({ type: "input.button", button: "right", phase: "press" })}
          className="py-4"
        />
      </div>
    </section>
  );
}

export function WeatherRemote({ state }: { state: HostState }) {
  const weather = state.weather;
  return (
    <div className="flex flex-col gap-5">
      <section className="card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="t-label">{weather.location ?? "Weather"}</p>
            {weather.current ? (
              <>
                <p className="t-display mt-1 t-tabular">
                  {weather.current.temp}°{weather.units === "metric" ? "C" : "F"}
                </p>
                <p className="text-[14px] text-[var(--ink-2)]">{weather.current.label}</p>
                <p className="mt-0.5 text-[12px] text-[var(--ink-4)]">
                  Wind {weather.current.windKph} · updated {formatRelative(weather.updatedAt)}
                </p>
              </>
            ) : (
              <p className="mt-2 text-[14px] text-[var(--ink-3)]">{weather.error ?? "No data yet."}</p>
            )}
          </div>
          <Button icon="refresh" size="sm" onClick={() => send({ type: "weather.refresh" })}>
            Refresh
          </Button>
        </div>

        {weather.forecast.length > 0 ? (
          <div className="mt-4 flex justify-between gap-1">
            {weather.forecast.map((day) => (
              <div key={day.dayLabel} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[11px] text-[var(--ink-3)]">{day.dayLabel}</span>
                <span className="t-tabular text-[15px] font-semibold">{day.high}°</span>
                <span className="t-tabular text-[12px] text-[var(--ink-4)]">{day.low}°</span>
              </div>
            ))}
          </div>
        ) : null}
      </section>
      {weather.error && weather.current ? (
        <p className="px-1 text-[12px] text-[var(--warn)]">
          Showing the last successful reading — {weather.error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Anything the remote does not have a surface for.
 *
 * A host may ship an application this build has never heard of. Falling back to
 * the D-pad means that application is still usable from the phone on day one,
 * which is the difference between an extensible system and one that needs both
 * halves released together.
 */
export function DefaultRemote({ state }: { state: HostState }) {
  const app = state.apps.catalog.find((entry) => entry.id === state.apps.activeAppId);
  return (
    <div className="flex flex-col gap-5">
      <section className="card p-4">
        <DirectionalPad />
      </section>
      <p className="px-1 text-[12px] text-[var(--ink-4)]">
        {app
          ? `${app.title} has no dedicated controls in this version of the remote — the D-pad works for everything.`
          : "Generic controls."}
      </p>
    </div>
  );
}
