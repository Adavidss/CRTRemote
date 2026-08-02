import { useState } from "react";
import type { PreviewMode } from "@/protocol";
import { applyConnection, connectionModeLabel, detectRelay, send, useConnection } from "@/state/connection.ts";
import { probeRelay } from "@/services/transports/discovery.ts";
import { normaliseRoomCode } from "@/services/transports/cloudRelay.ts";
import {
  isMixedContentBlocked,
  THEME_LABELS,
  THEMES,
  updateSettings,
  useSettings,
  type ConnectionMode,
  type Theme,
} from "@/state/settings.ts";
import { ConnectionPill } from "@/components/ConnectionPill.tsx";
import { Screen } from "@/components/Screen.tsx";
import { Button, Row, RowGroup, Segmented, Sheet, Toggle } from "@/components/ui/controls.tsx";
import { Icon } from "@/components/ui/Icon.tsx";

/**
 * Settings, split by who owns what.
 *
 * The top half changes the CRT and every command goes over the wire. The bottom
 * half changes this phone and never leaves it. Keeping them visibly separate
 * matters on a remote control, where "did that change my screen or the
 * television?" is a real and constant question.
 */
export function SettingsPage() {
  const { state, transport, identity } = useConnection();
  const settings = useSettings();
  const [editingHost, setEditingHost] = useState(false);
  const [addressDraft, setAddressDraft] = useState(settings.hostAddress);
  const [portDraft, setPortDraft] = useState(String(settings.hostPort));
  const [detecting, setDetecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const mixedContent = isMixedContentBlocked();
  // Only these two dial out over the network, so only these two care about an
  // address or are blocked by the page being served over HTTPS. Broadcast talks
  // to another tab and is unaffected by both.
  const needsRelay = settings.connectionMode === "websocket" || settings.connectionMode === "http";

  return (
    <Screen title="Settings" trailing={<ConnectionPill />}>
      {/* ── this phone ─────────────────────────────────────────── */}
      <RowGroup label="Connection">
        <div className="px-4 py-3">
          <Segmented<ConnectionMode>
            options={[
              { value: "simulator", label: "Simulator" },
              { value: "cloud", label: "Public relay" },
              { value: "broadcast", label: "This browser" },
              { value: "websocket", label: "WebSocket" },
              { value: "http", label: "HTTP" },
            ]}
            value={settings.connectionMode}
            onChange={(mode) => updateSettings({ connectionMode: mode })}
          />
          <p className="mt-2 text-[12px] text-[var(--ink-4)]">
            {settings.connectionMode === "simulator"
              ? "A simulated CRT runs inside this page. Nothing leaves the device."
              : settings.connectionMode === "cloud"
                ? "Meets the CRT at a relay on the internet, so this phone does not have to be on its network."
                : settings.connectionMode === "broadcast"
                  ? "Drives a real CRTHost open in another tab of this browser. No relay, no network — but the same machine only."
                  : settings.connectionMode === "websocket"
                    ? "Preferred. One socket, pushed both ways."
                    : "Fallback for networks that block WebSockets. Slower, and previews suffer."}
          </p>
        </div>

        {settings.connectionMode === "cloud" ? (
          <div className="px-4 py-3">
            <label className="mb-3 block">
              <span className="t-label mb-1 block">Relay URL</span>
              <input
                value={settings.cloudRelayUrl}
                onChange={(event) => updateSettings({ cloudRelayUrl: event.target.value })}
                placeholder="https://crt-relay.your-name.workers.dev"
                inputMode="url"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                className="w-full border border-[var(--hairline)] bg-[var(--surface-2)] px-3 py-2 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              />
            </label>

            <label className="block">
              <span className="t-label mb-1 block">Code from the CRT</span>
              <input
                value={settings.cloudRoom}
                onChange={(event) => {
                  // Store the canonical form once it is complete, so a code
                  // read aloud and typed in lower case still matches.
                  const code = normaliseRoomCode(event.target.value);
                  updateSettings({ cloudRoom: code ?? event.target.value.toUpperCase() });
                }}
                placeholder="ABCD-2345"
                spellCheck={false}
                autoCapitalize="characters"
                autoCorrect="off"
                maxLength={9}
                className="w-full border border-[var(--hairline)] bg-[var(--surface-2)] px-3 py-2 text-[17px] tracking-[0.25em] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              />
            </label>

            <p className="mt-2 text-[12px] text-[var(--ink-4)]">
              {normaliseRoomCode(settings.cloudRoom)
                ? "Anyone with this code can drive the CRT. Ask the host for a new one to revoke it."
                : "On the CRT, open Connect a remote → From anywhere, and read off the code."}
            </p>
          </div>
        ) : null}

        {needsRelay ? (
          <Row
            label="Relay address"
            detail={`${settings.hostAddress}:${settings.hostPort}`}
            icon="link"
            onClick={() => {
              setAddressDraft(settings.hostAddress);
              setPortDraft(String(settings.hostPort));
              setEditingHost(true);
            }}
          />
        ) : null}

        {settings.connectionMode !== "simulator" ? (
          <Row label="Link" detail={transport?.detail ?? transport?.status ?? "idle"} icon="power">
            <Button size="sm" icon="refresh" onClick={() => void applyConnection(true)}>
              Retry
            </Button>
          </Row>
        ) : null}

        {/* When this page was served by the relay, the relay is simply where
            the page came from — so "find it" is one request, not a scan. */}
        <Row
          label="Find the CRT"
          detail={
            detecting
              ? "Looking…"
              : mixedContent
                ? "Not possible over HTTPS"
                : "Use whatever served this page"
          }
          icon="link"
        >
          <Button
            size="sm"
            busy={detecting}
            disabled={mixedContent}
            onClick={() => {
              setDetecting(true);
              void detectRelay()
                .then((found) => {
                  setTestResult(found ? null : "No CRT answered at this address.");
                })
                .finally(() => setDetecting(false));
            }}
          >
            Detect
          </Button>
        </Row>
      </RowGroup>

      {testResult ? <p className="px-1 text-[12px] text-[var(--warn)]">{testResult}</p> : null}

      {mixedContent && needsRelay ? (
        <p className="rounded-[var(--radius)] border border-[var(--warn)]/30 bg-[var(--warn)]/8 px-4 py-3 text-[13px] leading-relaxed text-[var(--warn)]">
          This page is served over HTTPS, and browsers refuse plain <span className="t-mono">ws://</span> and{" "}
          <span className="t-mono">http://</span> connections from a secure page. To control a CRT over the network,
          open this remote from the relay itself — it serves this app over plain HTTP on your network. To drive a
          real CRTHost without a relay, open it in another tab and choose <strong>This browser</strong> above. The
          simulator works here either way.
        </p>
      ) : null}

      {/* ── the CRT ────────────────────────────────────────────── */}
      {state ? (
        <>
          <RowGroup label="Display">
            <div className="px-4 py-3">
              <p className="t-label mb-2">Mode</p>
              <Segmented
                options={[
                  { value: "remote", label: "CRT apps" },
                  { value: "computer", label: "Computer" },
                ]}
                value={state.display.mode}
                onChange={(mode) => send({ type: "display.setMode", mode: mode as "remote" | "computer" })}
              />
              <p className="mt-2 text-[12px] text-[var(--ink-4)]">
                Switching to the computer display asks for confirmation and disables these controls.
              </p>
            </div>

            <div className="px-4 py-3">
              <p className="t-label mb-2">Palette</p>
              <div className="flex flex-wrap gap-2">
                {state.display.palettes.map((palette) => (
                  <button
                    key={palette.id}
                    type="button"
                    onClick={() => send({ type: "display.setPalette", paletteId: palette.id })}
                    className={`pressable focus-ring flex items-center gap-2 rounded-none border px-3 py-1.5 text-[12px] ${
                      palette.id === state.display.paletteId
                        ? "border-[var(--accent)] text-[var(--ink)]"
                        : "border-[var(--hairline)] text-[var(--ink-3)]"
                    }`}
                  >
                    <span className="flex overflow-hidden rounded-none">
                      {palette.swatch.map((colour) => (
                        <span key={colour} className="h-3 w-2" style={{ background: colour }} />
                      ))}
                    </span>
                    {palette.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[12px] text-[var(--ink-4)]">
                Every palette is ordered by brightness, so it stays readable on a black-and-white set.
              </p>
            </div>

            <Row label="Brightness" detail={`${Math.round(state.settings.brightness * 100)}%`} icon="sun">
              <input
                type="range"
                min={20}
                max={100}
                value={Math.round(state.settings.brightness * 100)}
                onChange={(event) =>
                  send({ type: "system.setSetting", key: "brightness", value: Number(event.target.value) / 100 })
                }
                aria-label="Brightness"
                className="w-28 accent-[var(--accent)]"
              />
            </Row>

            <Row label="Overscan" detail={`${Math.round(state.display.overscan * 100)}%`} icon="tv">
              <input
                type="range"
                min={0}
                max={16}
                value={Math.round(state.display.overscan * 100)}
                onChange={(event) =>
                  send({ type: "display.setOverscan", overscan: Number(event.target.value) / 100 })
                }
                aria-label="Overscan"
                className="w-28 accent-[var(--accent)]"
              />
            </Row>
          </RowGroup>

          <RowGroup label="Preview">
            <div className="px-4 py-3">
              <Segmented<PreviewMode>
                options={[
                  { value: "off", label: "Off" },
                  { value: "low", label: "Low" },
                  { value: "high", label: "High" },
                ]}
                value={state.preview.mode}
                onChange={(mode) => send({ type: "preview.configure", mode })}
              />
              <p className="mt-2 text-[12px] text-[var(--ink-4)]">
                The CRT encodes an image for every frame it sends. Off costs it nothing.
              </p>
            </div>
            <Row label="Show preview on Home">
              <Toggle
                checked={settings.showPreviewOnHome}
                onChange={(next) => updateSettings({ showPreviewOnHome: next })}
                label="Show preview on Home"
              />
            </Row>
          </RowGroup>

          <RowGroup label="Behaviour">
            <Row label="Burn-in protection" detail="Drifts static content a few pixels">
              <Toggle
                checked={state.settings.burnInProtection}
                onChange={(next) => send({ type: "system.setSetting", key: "burnInProtection", value: next })}
                label="Burn-in protection"
              />
            </Row>
            <Row label="Attract mode" detail="Show animations when idle">
              <Toggle
                checked={state.settings.attractMode}
                onChange={(next) => send({ type: "system.setSetting", key: "attractMode", value: next })}
                label="Attract mode"
              />
            </Row>
            <Row
              label="Idle timeout"
              detail={state.settings.idleTimeoutMinutes === 0 ? "Never" : `${state.settings.idleTimeoutMinutes} min`}
            >
              <input
                type="range"
                min={0}
                max={60}
                step={1}
                value={state.settings.idleTimeoutMinutes}
                onChange={(event) =>
                  send({ type: "system.setSetting", key: "idleTimeoutMinutes", value: Number(event.target.value) })
                }
                aria-label="Idle timeout"
                className="w-28 accent-[var(--accent)]"
              />
            </Row>
            <Row label="Identify" detail="Flash the name on the CRT" icon="bolt">
              <Button size="sm" onClick={() => send({ type: "system.identify" })}>
                Identify
              </Button>
            </Row>
          </RowGroup>
        </>
      ) : null}

      {/* ── this phone, again ──────────────────────────────────── */}
      <RowGroup label="This remote">
        <div className="px-4 py-3">
          <p className="t-label mb-2">Theme</p>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((theme) => (
              <ThemeSwatch
                key={theme}
                theme={theme}
                selected={settings.theme === theme}
                onSelect={() => updateSettings({ theme })}
              />
            ))}
          </div>
        </div>
        <Row label="Haptics" detail="A tick when a control does something">
          <Toggle checked={settings.haptics} onChange={(next) => updateSettings({ haptics: next })} label="Haptics" />
        </Row>
        <Row label="Keep screen awake" detail="While this remote is open">
          <Toggle
            checked={settings.keepAwake}
            onChange={(next) => updateSettings({ keepAwake: next })}
            label="Keep screen awake"
          />
        </Row>
      </RowGroup>

      {identity ? (
        <p className="px-1 text-[12px] text-[var(--ink-4)]">
          Connected to {identity.name} ({identity.model}) over {connectionModeLabel(settings.connectionMode)} · host
          software {identity.version}.
        </p>
      ) : null}

      <Sheet open={editingHost} onClose={() => setEditingHost(false)} title="Relay address">
        <p className="mb-3 text-[13px] text-[var(--ink-3)]">
          The hostname or IP of the machine running the relay. <span className="t-mono">crt.local</span> works if mDNS
          is available on your network.
        </p>
        <div className="flex gap-2">
          <input
            value={addressDraft}
            onChange={(event) => setAddressDraft(event.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="focus-ring t-mono min-w-0 flex-1 rounded-[var(--radius)] border border-[var(--hairline)] bg-[var(--bg-2)] px-4 py-3 text-[15px] outline-none"
            placeholder="crt.local"
          />
          <input
            value={portDraft}
            onChange={(event) => setPortDraft(event.target.value.replace(/\D/g, "").slice(0, 5))}
            inputMode="numeric"
            className="focus-ring t-mono w-24 rounded-[var(--radius)] border border-[var(--hairline)] bg-[var(--bg-2)] px-3 py-3 text-[15px] outline-none"
            placeholder="7890"
          />
        </div>
        {/* Testing before committing turns a wrong address from "nothing works
            and I do not know why" into one line of feedback. */}
        <Button
          size="sm"
          icon="link"
          busy={testing}
          className="mt-3"
          onClick={() => {
            setTesting(true);
            setTestResult(null);
            void probeRelay(addressDraft, Number(portDraft) || 7890)
              .then((status) => {
                setTestResult(
                  status
                    ? `Found a relay — ${status.hosts ?? 0} CRT, ${status.remotes ?? 0} remote(s) connected.`
                    : "Nothing answered there.",
                );
              })
              .finally(() => setTesting(false));
          }}
        >
          Test this address
        </Button>
        {testResult ? <p className="mt-2 text-[12px] text-[var(--ink-2)]">{testResult}</p> : null}

        <div className="mt-4 flex gap-3">
          <Button tone="plain" size="lg" fullWidth onClick={() => setEditingHost(false)}>
            Cancel
          </Button>
          <Button
            tone="accent"
            size="lg"
            fullWidth
            onClick={() => {
              updateSettings({
                hostAddress: addressDraft.trim() || "crt.local",
                hostPort: Number(portDraft) || 7890,
                connectionMode: settings.connectionMode === "simulator" ? "websocket" : settings.connectionMode,
              });
              setEditingHost(false);
              setTestResult(null);
              void applyConnection(true);
            }}
          >
            Connect
          </Button>
        </div>
      </Sheet>
    </Screen>
  );
}

function ThemeSwatch({
  theme,
  selected,
  onSelect,
}: {
  theme: Theme;
  selected: boolean;
  onSelect: () => void;
}) {
  // Each swatch is the phosphor's own ramp rather than one dot of its accent:
  // these themes are defined by how their steps are spaced, so showing three
  // rungs tells you what you are choosing in a way a single colour cannot.
  const ramp: Record<Theme, [string, string, string]> = {
    "p4-mono": ["#64666a", "#c0c3c8", "#eceef2"],
    "p1-green": ["#206830", "#60d870", "#b8f8b0"],
    "p3-amber": ["#784c10", "#f0a830", "#f8d890"],
    "p7-blue": ["#4d6180", "#b0c8e8", "#dbe6f5"],
    ember: ["#8a3a3c", "#f39c4a", "#ecdcb0"],
    seafoam: ["#1f6f5f", "#6fd39b", "#d6ecdf"],
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`pressable focus-ring flex items-center gap-2 border px-3 py-1.5 text-[12px] ${
        selected ? "border-[var(--accent)] text-[var(--ink)]" : "border-[var(--hairline)] text-[var(--ink-3)]"
      }`}
    >
      <span className="flex h-3.5">
        {ramp[theme].map((step) => (
          <span key={step} className="w-2" style={{ background: step }} />
        ))}
      </span>
      {THEME_LABELS[theme]}
      {selected ? <Icon name="check" size={13} className="text-[var(--accent)]" /> : null}
    </button>
  );
}
