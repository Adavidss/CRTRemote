import type { ConnectionRole } from "@/protocol";
import { BroadcastChannelTransport } from "./BroadcastChannelTransport.ts";
import { cloudRoomStatus, type CloudPairing } from "./cloudRelay.ts";
import { discoverRelayFromOrigin, type RelayEndpoint } from "./discovery.ts";

/**
 * Working out how to connect, instead of asking.
 *
 * There are four ways the two halves can reach each other and they are not
 * alternatives a person should be choosing between — each one covers a
 * situation the others physically cannot, and which situation you are in is
 * something the page can determine for itself in a few hundred milliseconds.
 * Presenting them as a menu of five radio buttons on each side, both defaulting
 * to a simulation, produced the worst possible outcome: two applications that
 * open looking like they work while being wired to nothing, and no explanation.
 *
 * So the transport is now a *consequence* rather than a question. Candidates are
 * tried in order of how definite they are:
 *
 *   1. Served by a relay — then that relay is the answer, no probing needed.
 *      This is the Raspberry Pi, and `npm run serve`.
 *   2. A saved cloud pairing with someone actually in the room.
 *   3. The other half open in another tab of this browser.
 *   4. Nothing — fall back to the simulation, and say so plainly.
 *
 * Manual selection still exists for when this guesses wrong, but it is now a
 * diagnostic rather than the front door.
 */

export type LinkKind = "relay" | "cloud" | "broadcast" | "none";

export interface LinkChoice {
  kind: LinkKind;
  /** One line, for the UI. Says what was found, not what was tried. */
  reason: string;
  relay?: RelayEndpoint;
  cloud?: CloudPairing;
}

export interface ChooseLinkOptions {
  role: ConnectionRole;
  /** A saved pairing, if the user has ever set one up. */
  cloud?: CloudPairing | null;
  /** How long to wait for another tab to answer. */
  broadcastProbeMs?: number;
}

export async function chooseLink({
  role,
  cloud,
  broadcastProbeMs = 700,
}: ChooseLinkOptions): Promise<LinkChoice> {
  // 1 — Served by a relay. No probe: if this page came from a relay then that
  // relay is where the other half will be looking, whether or not it has
  // arrived yet. Waiting for a peer here would refuse the correct answer
  // simply because the CRT had not finished booting.
  const relay = await discoverRelayFromOrigin();
  if (relay) {
    return {
      kind: "relay",
      reason: relay.addresses.length
        ? `The relay serving this page, on ${relay.addresses[0]}`
        : "The relay serving this page",
      relay,
    };
  }

  // 2 — A saved pairing. Only worth using if someone is actually in the room;
  // otherwise a stale code would beat a perfectly good tab sitting next door.
  if (cloud?.relayUrl && cloud.room) {
    const status = await cloudRoomStatus(cloud);
    const peers = status ? (role === "host" ? status.remotes : status.hosts) : 0;
    if (peers > 0) {
      return { kind: "cloud", reason: `Paired over the internet, room ${cloud.room}`, cloud };
    }
  }

  // 3 — The other half in another tab. The probe announces *our* role and
  // listens for anything that is not it.
  if (await BroadcastChannelTransport.probePeer(role, broadcastProbeMs)) {
    return { kind: "broadcast", reason: "The other half, in another tab of this browser" };
  }

  // 4 — Genuinely alone. The caller falls back to a simulation and must label
  // it as one: a fake that looks real is worse than an honest disconnection.
  return {
    kind: "none",
    reason: cloud?.relayUrl && cloud.room ? "Nobody in the paired room yet" : "No CRT found nearby",
  };
}
