# Architecture

This document describes the whole system — both halves. An identical copy lives
in CRTRemote, because a description of a contract that only one party can read
is not a contract.

## The one rule

**The Raspberry Pi is the source of truth.** CRTHost owns rendering,
application state, the digital pet, save files and the screen. CRTRemote asks
for things and displays what comes back. It holds a *copy* of the host's state
and never edits it.

That rule is not architectural fussiness; it is the reason the system can be
trusted. A phone that keeps its own model of the pet is a phone that will one
day show a fed pet next to a hungry one on the television, and there is no
correct way to resolve that. There is only ever one simulation, and it is on the
Pi.

The visible consequences are worth stating, because they look like bugs if you
do not expect them:

- The pet gets hungry while your phone is in your pocket.
- A control can be refused. The button does not change; a message explains why.
- Two phones control the same CRT with no coordination between them.
- Turning the phone off changes nothing at all.

## Shape

```
┌────────────────────────────┐        ┌────────────────────────────┐
│         CRTHost            │        │        CRTRemote           │
│      (Raspberry Pi)        │        │    (phone, GitHub Pages)   │
│                            │        │                            │
│  ApplicationManager        │        │  pages/ + remotes/         │
│  ├── Clock                 │        │  ├── Home                  │
│  ├── Games ── cores        │        │  ├── Applications          │
│  ├── Digital Pet ── sim    │        │  ├── Remote (per-app)      │
│  ├── Animations, Photos,   │        │  ├── Settings              │
│  │   Videos, Visualizer,   │        │  └── About                 │
│  │   Weather               │        │                            │
│  └── Home (launcher)       │        │  HostConnection            │
│                            │        │       │                    │
│  Framebuffer 320×240       │        │       │                    │
│       │                    │        │       │                    │
│  RemoteService             │        │       │                    │
│       │                    │        │       │                    │
└───────┼────────────────────┘        └───────┼────────────────────┘
        │                                     │
        │            ┌──────────┐             │
        └────────────│  relay   │─────────────┘
                     └──────────┘
              WebSocket, or HTTP long-poll,
              or an in-process loopback
```

Neither application contains networking logic outside `services/transports/`.
Both talk to a `Transport` — an interface with `connect`, `send`, `onFrame`,
`onStatus` — and nothing else. Four implementations satisfy it:

| Transport | Used by | Why it exists |
|---|---|---|
| `WebSocketTransport` | both, in production | Preferred. One socket, pushed both ways. |
| `HttpPollingTransport` | both, as fallback | Networks that eat WebSocket upgrades. Long-polled, not fast-polled. |
| `LoopbackTransport` | both, in development | Pairs two ends in one process. No server, no hardware. |
| a test double | tests | Nothing to stub but one small interface. |

The day the hardware arrives, the only file that changes is the one that
constructs the transport.

## Layers

### CRTHost

```
src/
  protocol/     the wire contract — types and pure functions only
  runtime/      framebuffer, loop, font, palette, application framework
  apps/         one directory per application
  services/     RemoteService, transports, preview, saves, HostController
  components/   the React shell around the canvas
  config.ts     deployment choices (resolution, overscan, relay port, …)
server/
  relay.mjs     the always-on process that both halves connect to
```

`runtime/` knows nothing about the network. `services/` knows nothing about
drawing. `apps/` know about neither: an application is handed a framebuffer and
a clock, and everything else it needs arrives through `AppServices`.

### CRTRemote

```
src/
  protocol/     identical copy of the contract
  services/     HostConnection, transports, the simulated host
  state/        connection wiring and this device's own settings
  remotes/      one control surface per application, plus a registry
  pages/        the five tabs and two sub-screens
  components/   the design system
```

## Rendering

CRTHost draws into a 320×240 buffer of *ink indices* — one byte per pixel, no
colour — and expands it through a palette lookup at present time, then scales it
by exactly two with nearest-neighbour to 640×480.

Three deliberate choices:

- **No canvas 2D drawing.** Canvas antialiases, and an antialiased edge on a CRT
  is a smeared edge on top of the smearing the tube already does. Every
  primitive writes bytes.
- **Eight ink levels, not RGB.** The target set is black and white, so two
  colours that differ only in hue are the same colour by the time they arrive.
  Making the ramp the only way to name a colour turns "readable in monochrome"
  from a review item into something the types enforce. Colour palettes exist for
  a colour tube later, and are constrained the same way: entry *N* must be
  perceptually lighter than *N−1*, which is asserted at boot.
- **Integer scale of two.** One internal pixel becomes two scanlines, so every
  pixel lands on both interlace fields of a 480i display and a horizontal edge
  cannot shimmer at 30 Hz.

**No CRT effects are simulated.** No scanlines, no curvature, no bloom, no
noise. The tube supplies all of that for real; adding a fake copy on top only
costs resolution.

## The application framework

Every application implements the same interface:

```
initialize()  once, at boot, for everyone       — load saves, build tables
start()       becoming the front application    — reset transient view state
pause()       something took the screen
resume()      got it back
stop()        leaving                           — persist anything durable
update(ctx)   fixed 60 Hz
render(ctx)   once per painted frame, no mutation
handleInput() returns true if consumed
```

Plus three optional hooks: `handleCommand` for anything that is not a button
press, `getStatusLine` for the phone's status area, and `getOverlay` for the one
thing the framebuffer cannot do — video.

Only one application runs at a time. That is a product decision: a CRT this size
has room for exactly one idea, and enforcing it centrally means no application
ever has to consider whether it is sharing the screen.

Adding one is a file plus a line in `src/apps/index.ts`. Nothing else — not the
launcher, not the protocol, not the remote — needs to be told. See
[ADDING_APPS.md](ADDING_APPS.md).

## Display modes

**Remote mode** — CRTHost renders its own applications, phone controls enabled.

**Computer display mode** — the Pi behaves like an HDMI display and the CRT
mirrors a connected computer. CRTHost stops rendering; phone controls are
disabled.

Switching requires confirmation, and the confirmation is modelled as a request
*from the host*: it is the host that knows it is about to take the screen away
and disable every control on the phone. Modelling it that way means the
confirmation is correct no matter which remote — or which button on the Pi —
started it.

## Preview

CRTHost can publish images of what is on screen. Off by default, with three
modes (off / low / high), because it is the one feature that costs the host real
work for the remote's benefit — and that cost should be visible and
controllable rather than ambient.

Encoding is PNG from the *internal* 320×240 canvas: the buffer holds eight
distinct values, so PNG is both tiny and exact, where JPEG would spend bytes
inventing ringing around every hard edge. If an encode starts costing more than
a tenth of the interval, the service stretches the interval rather than dropping
frames elsewhere.

## Where the seams are

If you are looking for the place to change something:

| You want to… | Change |
|---|---|
| add an application | `src/apps/`, `src/apps/index.ts` |
| add a control surface for it | CRTRemote `src/remotes/`, `registry.ts` |
| change how the two halves talk | `src/services/transports/` |
| change what they say | `src/protocol/` in **both** repos |
| change what the CRT looks like | `src/runtime/palette.ts`, `src/runtime/draw.ts` |
| change the phone's look | CRTRemote `src/index.css` |
| point at different hardware | `src/config.ts` |
