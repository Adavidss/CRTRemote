# Communication model

An identical copy of this file lives in CRTRemote.

## The contract

`src/protocol/` is duplicated **byte for byte** in both repositories. It holds
types and pure functions only — no transport, no I/O, nothing that could pull
one side's runtime into the other's. `src/services/transports/` is duplicated
the same way.

Both repos ship the same check:

```bash
npm run check:protocol           # compare against the sibling clone
node scripts/check-protocol.mjs --write   # push ours over theirs
```

It looks for the sibling repository next to this one. Clone them into the same
parent directory and the check runs; clone one alone and it skips rather than
failing.

Why duplication rather than a package or a submodule: either half must stay
usable on its own with a plain `git clone` and `npm install`. A registry
package means publishing to change a type; a submodule means every clone
needs an extra step and every branch needs a pointer bump. Copies plus a
failing check is the arrangement with the fewest moving parts, and drift is
caught the moment either side builds.

## Flow

```
phone                        relay                        CRT
  │                                                        │
  │── system.hello ──────────────────────────────────────▶ │
  │ ◀───────────────────────────────── hello + state.full ─│
  │                                                        │
  │── app.launch { appId: "pet" } ───────────────────────▶ │
  │                                          ApplicationManager.launch
  │                                          PetApp.start()
  │                                          host.patch({ pet })
  │ ◀──────────────────────────────────────── state.patch ─│
  │ ◀───────────────────────────────────────────────  ack ─│
  │                                                        │
  UI updates from the patch — never from the tap
```

The phone never edits its copy to make the UI feel faster. Optimism lives in
the *transition* — a button dims while its acknowledgement is outstanding —
never in the state. A local edit the host then declines is a lie the user has to
notice and undo.

## Framing

Everything travels in an envelope:

```ts
{ v: 1, kind: "command" | "message", id: string, sentAt: number, … }
```

`decode()` validates the shape and the protocol version before anything
downstream is allowed to believe it. It deliberately does *not* validate each
command's own fields: the host's handler is a defensive switch anyway, and
duplicating every payload's schema would be one more thing to keep in sync for
no extra safety.

A version mismatch fails at the handshake with a message naming both versions,
rather than later in some confusing half-connected way.

## State and patches

The host publishes one object, `HostState`. Changes go out as patches, which
are a **two-level shallow merge**: named slices replace named fields, arrays are
replaced wholesale, anything unmentioned is left alone.

```ts
{ games: { activeGameId: "beacon-run" } }   // does not resend the library
```

Two levels rather than one lets the host avoid re-sending a hundred-entry
library to say which game is running, while stopping well short of a
general-purpose deep merge whose behaviour nobody can predict at a glance.
`applyPatch` and `diffState` are pure, shared, and used by both sides — so the
two ends cannot disagree about what a patch means.

Broadcasts are coalesced on a 100 ms timer. Applications patch state freely (the
pet touches six meters a second); without coalescing that would be hundreds of
tiny messages a second saying what one message could.

## Commands

Requests, not assignments. The host may decline, clamp or defer any of them, and
answers with an `ack` either way. A refused command carries a reason, which the
phone shows.

Grouped by area: `system.*`, `app.*`, `input.*`, `display.*`, `preview.*`,
`pet.*`, `games.*`, `media.control`, `clock.configure`, `weather.refresh`. See
`src/protocol/commands.ts`.

### Input

Input is modelled as an abstract game controller, not as taps. The phone decides
how to present a button — a D-pad, a big round "A", a list row; the host only
ever sees the button. The same host code then serves a touch remote, a USB
gamepad plugged into the Pi, and a keyboard on a development machine without a
single branch.

Directions are *held*: `down` on press, `up` on release. Face buttons send a
single `press`, which the host expands into a down/up pair — halving the traffic
on a held D-pad and making it impossible for a dropped `up` to leave a button
stuck.

Commands that are not button presses (`pet.interact`, `games.launch`) go through
`handleCommand` instead. The phone is not pretending to be a controller when it
says "feed the pet", and forcing that through a D-pad abstraction would lose
fidelity in both directions.

## Messages

`hello`, `state.full`, `state.patch`, `preview.frame`, `ack`, `notice`,
`confirm.request`, `confirm.cancel`, `pong`.

`confirm.request` is how the host asks a yes/no question. It does not act until
it gets `system.confirm` back, and it resolves to *no* on timeout — a host
waiting forever on a phone that went into a pocket would leave the CRT stuck
mid-action with no way out from the tube itself.

## The relay

Neither half addresses the other. Both connect to `server/relay.mjs` and are
told apart by a `role` query parameter; host messages go to every remote, and
every remote's commands go to the host. That indirection buys three things:

- The phone does not need to be reachable — it connects out, like the host.
- More than one remote works with no extra thought.
- Either side can restart without the other noticing beyond a reconnect.

It speaks WebSockets, and the same traffic over long-polled HTTP for networks
that block upgrades. It can also serve both applications as static files, which
is the intended arrangement on the Pi — see [DEPLOYMENT.md](DEPLOYMENT.md) for
why that matters more than it sounds.

Queued preview frames supersede each other: a client that has fallen behind
wants the newest image, not the sixty stale ones in front of it.

## Reconnection

Transports own their own reconnection — exponential backoff to eight seconds,
with jitter. The jitter matters when the Pi reboots: without it every remote
that was connected wakes on the same schedule and retries in the same
millisecond, forever.

A reconnected link is sent a full snapshot rather than a patch, because it has
no idea what the world looks like. WebSocket clients are pinged every fifteen
seconds; a half-open TCP connection is the normal failure mode on Wi-Fi, looks
fine to both ends, and is otherwise undetectable.

## Adding to the protocol

1. Change `src/protocol/` in **one** repo.
2. `node scripts/check-protocol.mjs --write` to copy it to the other.
3. Handle the new case on both sides. Both switches are exhaustive over the
   union, so the compiler lists what is missing.
4. Bump `PROTOCOL_VERSION` **only** if an old peer would now misbehave. A new
   optional field does not count; a renamed or removed one does.
