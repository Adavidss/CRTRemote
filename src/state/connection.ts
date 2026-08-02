import type { RemoteCommand, Transport } from "@/protocol";
import { HostConnection } from "@/services/HostConnection.ts";
import { SimulatedHost } from "@/services/simulator/SimulatedHost.ts";
import { BroadcastChannelTransport } from "@/services/transports/BroadcastChannelTransport.ts";
import { cloudSocketUrl } from "@/services/transports/cloudRelay.ts";
import { discoverRelayFromOrigin } from "@/services/transports/discovery.ts";
import { HttpPollingTransport } from "@/services/transports/HttpPollingTransport.ts";
import { LoopbackTransport } from "@/services/transports/LoopbackTransport.ts";
import { WebSocketTransport } from "@/services/transports/WebSocketTransport.ts";
import {
  hasStoredSettings,
  relayUrls,
  settingsStore,
  updateSettings,
  type ConnectionMode,
  type RemoteSettings,
} from "./settings.ts";
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
  // Neither of these points at an address, so including one would rebuild the
  // transport every time the user edited a host they are not using.
  if (settings.connectionMode === "simulator") return "simulator";
  if (settings.connectionMode === "broadcast") return "broadcast";
  if (settings.connectionMode === "cloud") {
    return `cloud:${settings.cloudRelayUrl}:${settings.cloudRoom}`;
  }
  return `${settings.connectionMode}:${settings.hostAddress}:${settings.hostPort}`;
}

function buildTransport(settings: RemoteSettings): Transport {
  const clientId = connection.getClientInfo().id;
  const urls = relayUrls(settings);

  if (settings.connectionMode === "broadcast") {
    return new BroadcastChannelTransport({ role: "remote", clientId });
  }

  if (settings.connectionMode === "cloud") {
    return new WebSocketTransport({
      url: cloudSocketUrl({ relayUrl: settings.cloudRelayUrl, room: settings.cloudRoom }),
      role: "remote",
      clientId,
      clientName: connection.getClientInfo().name,
    });
  }

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

/**
 * Point at the relay that served this page, if one did.
 *
 * When the relay on the Raspberry Pi is serving this app, its address is the
 * page's own origin — so opening the URL is the entire setup, and nobody has to
 * find out their Pi's IP address. Only ever applied on a device that has never
 * been configured; after that the user's choice wins.
 *
 * Returns true if it changed anything.
 */
export async function autoConfigure(): Promise<boolean> {
  if (hasStoredSettings()) return false;
  const relay = await discoverRelayFromOrigin();
  if (!relay) return false;
  updateSettings({
    connectionMode: "websocket",
    hostAddress: relay.host,
    hostPort: relay.port,
  });
  return true;
}

/** Detect on demand, from the settings screen. Overwrites what is there. */
export async function detectRelay(): Promise<boolean> {
  const relay = await discoverRelayFromOrigin();
  if (!relay) return false;
  updateSettings({
    connectionMode: "websocket",
    hostAddress: relay.host,
    hostPort: relay.port,
  });
  return true;
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
    case "broadcast":
      return "Same browser";
    case "cloud":
      return "Public relay";
    case "websocket":
      return "WebSocket";
    case "http":
      return "HTTP polling";
  }
}
