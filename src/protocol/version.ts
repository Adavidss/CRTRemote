/**
 * The wire contract version.
 *
 * Both halves of the system ship an identical copy of `src/protocol/`. Bump
 * this whenever a change would make an old peer misbehave — a new optional
 * field does not count, a renamed or removed one does. Peers exchange the
 * number in the handshake and refuse to pair on a mismatch rather than failing
 * later in some confusing, half-connected way.
 */
export const PROTOCOL_VERSION = 1;

/** Human-readable name for the contract, used in logs and the About screen. */
export const PROTOCOL_NAME = "crt-os";
