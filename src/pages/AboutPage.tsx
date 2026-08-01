import { PROTOCOL_NAME, PROTOCOL_VERSION } from "@/protocol";
import { useConnection } from "@/state/connection.ts";
import { connectionModeLabel } from "@/state/connection.ts";
import { useSettings } from "@/state/settings.ts";
import { ConnectionPill } from "@/components/ConnectionPill.tsx";
import { Screen } from "@/components/Screen.tsx";
import { Pill, Row, RowGroup } from "@/components/ui/controls.tsx";
import { formatUptime } from "@/utils/format.ts";

/**
 * About — a status page that also explains the shape of the system.
 *
 * The explanation is here because the division of labour is not obvious from
 * using the app, and it is the thing that makes the app's behaviour make sense:
 * why the pet keeps changing when the phone is shut, why a control can be
 * refused, why previews are off by default.
 */
export function AboutPage() {
  const { state, identity, transport, clockSkewMs, protocolMismatch } = useConnection();
  const settings = useSettings();

  return (
    <Screen title="About" subtitle="CRT Remote" trailing={<ConnectionPill />}>
      <section className="card p-4">
        <p className="text-[14px] leading-relaxed text-[var(--ink-2)]">
          The Raspberry Pi owns everything: the rendering, the applications, the digital pet, the save files. This
          remote holds no copy of any of it — it asks, and it shows what comes back.
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-[var(--ink-2)]">
          That is why the pet gets hungry while your phone is in your pocket, why a button can be politely refused,
          and why the CRT never has to agree with two devices about what is true.
        </p>
      </section>

      <RowGroup label="Host">
        <Row label="Name" detail={identity?.name ?? "—"} icon="tv" />
        <Row label="Model" detail={identity?.model ?? "—"} icon="monitor" />
        <Row label="Software" detail={identity?.version ?? "—"} />
        <Row
          label="Resolution"
          detail={state ? `${state.display.width}×${state.display.height} → ${state.display.outputWidth}×${state.display.outputHeight}` : "—"}
        />
        <Row label="Uptime" detail={state ? formatUptime(state.time.uptimeMs) : "—"} />
        <Row label="Time zone" detail={state?.time.timezone ?? "—"} />
      </RowGroup>

      {identity?.capabilities.length ? (
        <section>
          <p className="t-label mb-2 px-1">Host capabilities</p>
          <div className="flex flex-wrap gap-1.5">
            {identity.capabilities.map((capability) => (
              <Pill key={capability} tone="accent">
                {capability.replace(/-/g, " ")}
              </Pill>
            ))}
          </div>
          <p className="mt-2 px-1 text-[12px] text-[var(--ink-4)]">
            Controls for anything not listed here are hidden rather than offered and ignored.
          </p>
        </section>
      ) : null}

      <RowGroup label="Link">
        <Row label="Transport" detail={connectionModeLabel(settings.connectionMode)} icon="link" />
        <Row label="Status" detail={transport?.detail ?? transport?.status ?? "idle"} />
        <Row label="Round trip" detail={transport?.latencyMs !== null && transport?.latencyMs !== undefined ? `${transport.latencyMs} ms` : "—"} />
        <Row
          label="Clock difference"
          detail={clockSkewMs === null ? "—" : `${clockSkewMs > 0 ? "+" : ""}${clockSkewMs} ms`}
        />
        <Row label="Reconnects" detail={String(transport?.reconnects ?? 0)} />
      </RowGroup>

      <RowGroup label="Protocol">
        <Row label="Contract" detail={`${PROTOCOL_NAME} v${PROTOCOL_VERSION}`} icon="info" />
        <Row label="Host speaks" detail={identity ? `v${identity.protocolVersion}` : "—"} />
        {protocolMismatch ? <Row label="Warning" detail={protocolMismatch} /> : null}
      </RowGroup>

      <section className="card p-4">
        <p className="t-label">Simulation mode</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ink-3)]">
          With no Raspberry Pi on the network, this remote runs a simulated host inside the page. It speaks the same
          protocol over the same interfaces, so every screen here is exercising the real code path — including the
          preview images, which are genuinely rendered rather than mocked.
        </p>
      </section>

      <p className="px-1 text-center text-[12px] text-[var(--ink-4)]">
        CRTRemote · a companion to CRTHost
      </p>
    </Screen>
  );
}
