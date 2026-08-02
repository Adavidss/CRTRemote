import type { RemoteCommand, Transport } from "@/protocol";
import { HostConnection } from "@/services/HostConnection.ts";
import { SimulatedHost } from "@/services/simulator/SimulatedHost.ts";
import { BroadcastChannelTransport } from "@/services/transports/BroadcastChannelTransport.ts";
import { chooseLink, type LinkKind } from "@/services/transports/autoLink.ts";
import { cloudSocketUrl } from "@/services/transports/cloudRelay.ts";
import { createStore } from "@/utils/store.ts";
import { HttpPollingTransport } from "@/services/transports/HttpPollingTransport.ts";
import { LoopbackTransport } from "@/services/transports/LoopbackTransport.ts";
import { WebSocketTransport } from "@/services/transports/WebSocketTransport.ts";
import {
  relayUrls,
  settingsStore,
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
  // Auto depends on the saved pairing, because that is one of the things it
  // will try — but not on the manual address fields.
  if (settings.connectionMode === "auto") {
    return `auto:${settings.cloudRelayUrl}:${settings.cloudRoom}`;
  }
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

/**
 * What auto-connect settled on, for the UI to explain itself.
 *
 * `simulated` is tracked separately from the transport's own status because a
 * simulation reports itself perfectly connected — which is true and completely
 * misleading. Every screen that shows a connection needs to be able to say
 * "this is a pretend CRT" in the same breath.
 */
export interface LinkResolution {
  kind: LinkKind | "manual";
  reason: string;
  simulated: boolean;
  /** Still deciding. The UI shows "looking…" rather than a wrong answer. */
  resolving: boolean;
}

export const linkStore = createStore<LinkResolution>({
  kind: "none",
  reason: "Starting up",
  simulated: false,
  resolving: true,
});

export function useLink(): LinkResolution {
  return useStore(linkStore);
}

async function startSimulator(reason: string): Promise<void> {
  // Both ends of the loopback live in this tab; a little latency keeps the UI
  // honest about the fact that a command is a round trip.
  const [hostSide, remoteSide] = LoopbackTransport.pair({ latencyMs: 24, label: "simulator" });
  simulator = new SimulatedHost();
  await simulator.attach(hostSide);
  await connection.connect(remoteSide);
  linkStore.set({ kind: "none", reason, simulated: true, resolving: false });
}

/** Connect (or reconnect) for the current settings. Safe to call repeatedly. */
export async function applyConnection(force = false): Promise<void> {
  const settings = settingsStore.get();
  const key = keyFor(settings);
  if (!force && key === currentKey) return;
  currentKey = key;

  simulator?.stop();
  simulator = null;

  if (settings.connectionMode === "auto") {
    linkStore.set({ kind: "none", reason: "Looking for your CRT", simulated: false, resolving: true });

    const choice = await chooseLink({
      role: "remote",
      cloud:
        settings.cloudRelayUrl && settings.cloudRoom
          ? { relayUrl: settings.cloudRelayUrl, room: settings.cloudRoom }
          : null,
    });

    // Settings may have changed while we were probing — a later call owns the
    // connection now, and completing this one would fight it.
    if (keyFor(settingsStore.get()) !== key) return;

    if (choice.kind === "relay" && choice.relay) {
      await connection.connect(
        new WebSocketTransport({
          url: choice.relay.websocketUrl,
          role: "remote",
          clientId: connection.getClientInfo().id,
          clientName: connection.getClientInfo().name,
        }),
      );
    } else if (choice.kind === "cloud" && choice.cloud) {
      await connection.connect(
        new WebSocketTransport({
          url: cloudSocketUrl(choice.cloud),
          role: "remote",
          clientId: connection.getClientInfo().id,
          clientName: connection.getClientInfo().name,
        }),
      );
    } else if (choice.kind === "broadcast") {
      await connection.connect(
        new BroadcastChannelTransport({ role: "remote", clientId: connection.getClientInfo().id }),
      );
    } else {
      await startSimulator(choice.reason);
      return;
    }

    linkStore.set({ kind: choice.kind, reason: choice.reason, simulated: false, resolving: false });
    return;
  }

  if (settings.connectionMode === "simulator") {
    await startSimulator("Simulator chosen by hand");
    return;
  }

  linkStore.set({
    kind: "manual",
    reason: `${connectionModeLabel(settings.connectionMode)}, chosen by hand`,
    simulated: false,
    resolving: false,
  });
  await connection.connect(buildTransport(settings));
}

// `autoConfigure` and `detectRelay` used to live here: both rewrote the saved
// settings to point at whatever relay had served the page. `chooseLink` now
// discovers the same thing every time it connects, without editing anything the
// user might later be surprised by, so neither has a reason to exist.

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
    case "auto":
      return "Automatic";
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
