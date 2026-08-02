/**
 * Pairing against the public relay.
 *
 * The local relay needs no addressing: whoever connects to it is the pair. A
 * public one is shared with everybody, so the two halves have to name a meeting
 * point — and that name is the only thing between a stranger and the CRT. Hence
 * a random code, issued by the relay rather than chosen by a person, and a
 * deliberate refusal to remember it anywhere but the device that was told it.
 *
 * Both halves store the relay URL and the code themselves; this module only
 * knows how to normalise them and turn them into a socket URL.
 */

/** Matches the worker's alphabet: no 0/O, no 1/I/L. */
const CODE_SHAPE = /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

export interface CloudPairing {
  /** Base URL of the deployed worker, e.g. `https://crt-relay.x.workers.dev`. */
  relayUrl: string;
  /** The room code, normalised to `ABCD-2345`. */
  room: string;
}

/**
 * Accept what a person would actually type — lower case, spaces, a missing
 * dash — and return the canonical form, or null if it cannot be one.
 */
export function normaliseRoomCode(raw: string): string | null {
  const bare = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (bare.length !== 8) return null;
  const code = `${bare.slice(0, 4)}-${bare.slice(4)}`;
  return CODE_SHAPE.test(code) ? code : null;
}

/** Tolerate a URL typed without a scheme, and drop any trailing slash. */
export function normaliseRelayUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * The WebSocket URL for a pairing.
 *
 * `wss` when the relay is `https`, which it must be for a page served from
 * GitHub Pages to be allowed to open it at all.
 */
export function cloudSocketUrl({ relayUrl, room }: CloudPairing): string {
  const base = normaliseRelayUrl(relayUrl);
  const socket = base.replace(/^http/i, "ws");
  return `${socket}/socket?room=${encodeURIComponent(room)}`;
}

/** Ask the relay for a fresh code. */
export async function requestRoomCode(relayUrl: string, timeoutMs = 6000): Promise<string | null> {
  const base = normaliseRelayUrl(relayUrl);
  if (!base) return null;
  try {
    const response = await fetch(`${base}/api/new-room`, {
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { ok?: boolean; room?: string };
    return body?.ok === true && typeof body.room === "string" ? body.room : null;
  } catch {
    return null;
  }
}

/** Is the relay reachable at all? Used to tell "wrong URL" from "no peer yet". */
export async function checkCloudRelay(relayUrl: string, timeoutMs = 6000): Promise<boolean> {
  const base = normaliseRelayUrl(relayUrl);
  if (!base) return false;
  try {
    const response = await fetch(`${base}/api/health`, {
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!response.ok) return false;
    const body = (await response.json()) as { ok?: boolean };
    return body?.ok === true;
  } catch {
    return false;
  }
}

/** How many of each half are in a room. Null if the relay could not be asked. */
export async function cloudRoomStatus(
  { relayUrl, room }: CloudPairing,
  timeoutMs = 6000,
): Promise<{ hosts: number; remotes: number } | null> {
  const base = normaliseRelayUrl(relayUrl);
  if (!base || !CODE_SHAPE.test(room)) return null;
  try {
    const response = await fetch(`${base}/api/status?room=${encodeURIComponent(room)}`, {
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { ok?: boolean; hosts?: number; remotes?: number };
    if (body?.ok !== true) return null;
    return { hosts: body.hosts ?? 0, remotes: body.remotes ?? 0 };
  } catch {
    return null;
  }
}
