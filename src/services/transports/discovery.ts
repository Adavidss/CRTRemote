/**
 * Finding the relay.
 *
 * The intended setup on hardware is that the relay serves both applications, so
 * whichever half is running was almost certainly loaded *from* the relay — and
 * in that case its address is simply the page's own origin. Asking the origin
 * whether it is a relay turns "type in an IP address" into "open a URL", which
 * is the difference between a thing you can hand to someone and a thing you
 * have to talk them through.
 *
 * The probe is a single request to `/api/status`, which only the relay answers.
 */

export interface RelayEndpoint {
  host: string;
  port: number;
  websocketUrl: string;
  httpUrl: string;
  /**
   * LAN addresses the relay believes it is reachable on, straight from the
   * relay. A page cannot work these out for itself — it only knows the name it
   * was opened under, which is usually `localhost` and of no use to a phone.
   */
  addresses: string[];
  /** Whether the relay is also serving CRTRemote, at `/remote/`. */
  servesRemote: boolean;
}

interface RelayStatus {
  ok?: boolean;
  hosts?: number;
  remotes?: number;
  port?: number;
  addresses?: string[];
  serving?: { host?: boolean; remote?: boolean };
}

/** Is the page we are running from being served by a relay? */
export async function discoverRelayFromOrigin(timeoutMs = 1500): Promise<RelayEndpoint | null> {
  if (typeof window === "undefined") return null;
  const { protocol, hostname, host, port } = window.location;
  // A dev server or a file:// open is not a relay, and probing does no harm —
  // but there is nothing to find, so skip the request entirely.
  if (protocol !== "http:" && protocol !== "https:") return null;

  try {
    const response = await fetch(`${protocol}//${host}/api/status`, {
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body = (await response.json()) as RelayStatus;
    if (body?.ok !== true) return null;

    return {
      host: hostname,
      port: Number(port || (protocol === "https:" ? 443 : 80)),
      websocketUrl: `${protocol === "https:" ? "wss" : "ws"}://${host}/socket`,
      httpUrl: `${protocol}//${host}`,
      addresses: Array.isArray(body.addresses) ? body.addresses : [],
      servesRemote: body.serving?.remote === true,
    };
  } catch {
    // Not a relay, unreachable, or too slow. All the same answer.
    return null;
  }
}

/** Check an address the user typed, for the settings screen's test action. */
export async function probeRelay(
  hostAddress: string,
  port: number,
  timeoutMs = 2500,
): Promise<RelayStatus | null> {
  const address = hostAddress.trim();
  if (!address) return null;
  try {
    const response = await fetch(`http://${address}:${port}/api/status`, {
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body = (await response.json()) as RelayStatus;
    return body?.ok === true ? body : null;
  } catch {
    return null;
  }
}

/** Build an endpoint for an address typed by hand. */
export function relayEndpoint(hostAddress: string, port: number): RelayEndpoint {
  const host = hostAddress.trim() || "crt.local";
  return {
    host,
    port,
    websocketUrl: `ws://${host}:${port}/socket`,
    httpUrl: `http://${host}:${port}`,
    addresses: [],
    servesRemote: false,
  };
}
