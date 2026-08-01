/**
 * The contract between CRTHost and CRTRemote.
 *
 * This directory is duplicated byte-for-byte in both repositories. It is the
 * one place they are allowed to agree about anything, and it contains only
 * types and pure functions — no transport, no I/O, nothing that could pull one
 * side's runtime into the other's.
 *
 * Changing it means changing it in both repos: run `npm run check:protocol` to
 * be told when the copies have drifted.
 */

export * from "./version.ts";
export * from "./apps.ts";
export * from "./input.ts";
export * from "./pet.ts";
export * from "./state.ts";
export * from "./commands.ts";
export * from "./messages.ts";
export * from "./envelope.ts";
export * from "./transport.ts";
