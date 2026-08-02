import { updateSettings } from "./settings.ts";

/**
 * Setting the remote up by arriving at a URL.
 *
 * The host shows a QR code containing the relay and the room code; scanning it
 * lands here. Reading an eight-character code off one screen and typing it into
 * another was the last piece of manual setup left, and it was the piece most
 * likely to be got wrong on a phone keyboard.
 *
 * The parameters live in the *fragment* rather than the query string, for two
 * reasons: this app routes on the hash, so a query before it would be lost on
 * the first navigation; and a fragment is never sent to a server, which is
 * where a value that functions as a key belongs.
 */

export interface Pairing {
  relayUrl: string;
  room: string;
}

/** Pull `relay` and `room` out of `#/?relay=…&room=…`, if they are there. */
export function readPairingLink(hash = window.location.hash): Pairing | null {
  const at = hash.indexOf("?");
  if (at === -1) return null;

  const params = new URLSearchParams(hash.slice(at + 1));
  const relayUrl = params.get("relay")?.trim();
  const room = params.get("room")?.trim();
  if (!relayUrl || !room) return null;

  // Only ever an http(s) relay. A scanned link is attacker-controllable in
  // principle, and this value is about to be turned into a WebSocket URL.
  try {
    const parsed = new URL(relayUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  } catch {
    return null;
  }

  return { relayUrl, room };
}

/**
 * Apply a pairing carried in the URL, then take it back out of the address bar.
 *
 * Stripping it matters: the room code is a key, and leaving it in the visible
 * URL means it survives into screenshots, shared links and history. The
 * settings have it now, so the copy in the address bar is only a liability.
 *
 * Returns true if anything was applied.
 */
export function consumePairingLink(): boolean {
  const pairing = readPairingLink();
  if (!pairing) return false;

  updateSettings({
    connectionMode: "cloud",
    cloudRelayUrl: pairing.relayUrl,
    cloudRoom: pairing.room,
  });

  const hash = window.location.hash;
  const cleaned = hash.slice(0, hash.indexOf("?")) || "#/";
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${cleaned}`);
  return true;
}
