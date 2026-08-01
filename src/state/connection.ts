import type { RemoteCommand, Transport } from "@/protocol";
import { HostConnection } from "@/services/HostConnection.ts";
import { SimulatedHost } from "@/services/simulator/SimulatedHost.ts";
import { HttpPollingTransport } from "@/services/transports/HttpPollingTransport.ts";
import { LoopbackTransport } from "@/services/transports/LoopbackTransport.ts";
import { WebSocketTransport } from "@/services/transports/WebSocketTransport.ts";
import { relayUrls, settingsStore, type ConnectionMode, type RemoteSettings } from "./settings.ts";
import { useStore } from "@/utils/store.ts";

/**
 * Wires the connection to whatever the settings say.
 *
 * The three modes differ by one object. Simulator pairs a loopback with a
 * `SimulatedHost` in this same tab; the other two point a real transport at the
 * relay. Everything downstream — every screen, every control — is written
 * against `HostConnection` and cannot tell the difference, which is the whole
 * return on having put an interface here.
 */

export const connection = new HostConnection();

let simulator: SimulatedHost | null = null;
let currentKey = "";

function keyFor(settings: RemoteSettings): string {
  return settings.connectionMode === "simulator"
    ? "simulator"
    : `${settings.connectionMode}:${settings.hostAddress}:${settings.hostPort}`;
}

function buildTransport(settings: RemoteSettings): Transport {
  const clientId = connection.getClientInfo().id;
  const urls = relayUrls(settings);

  if (settings.connectionMode === "websocket") {
    return new WebSocketTransport({
      url: urls.websocket,
      role: "remote",
      clientId,
      clientName: connection.getClientInfo().name,
    });
  }
  return new HttpPollingTransport({ baseUrl: urls.http, role: "remote", clientId });
}

/** Connect (or reconnect) for the current settings. Safe to call repeatedly. */
export async function applyConnection(force = false): Promise<void> {
  const settings = settingsStore.get();
  const key = keyFor(settings);
  if (!force && key === currentKey) return;
  currentKey = key;

  simulator?.stop();
  simulator = null;

  if (settings.connectionMode === "simulator") {
    // Both ends of the loopback live in this tab; a little latency keeps the
    // UI honest about the fact that a command is a round trip.
    const [hostSide, remoteSide] = LoopbackTransport.pair({ latencyMs: 24, label: "simulator" });
    simulator = new SimulatedHost();
    await simulator.attach(hostSide);
    await connection.connect(remoteSide);
    return;
  }

  await connection.connect(buildTransport(settings));
}

// A change of host or mode reconnects; a change of theme does not.
settingsStore.subscribe(() => {
  void applyConnection();
});

export function send(command: RemoteCommand): string {
  return connection.send(command);
}

export function useConnection() {
  return useStore(connection.store);
}

export function useHostState() {
  return useStore(connection.store, (snapshot) => snapshot.state);
}

export function connectionModeLabel(mode: ConnectionMode): string {
  switch (mode) {
    case "simulator":
      return "Simulator";
    case "websocket":
      return "WebSocket";
    case "http":
      return "HTTP polling";
  }
}
