# CRTRemote

A mobile-first web app that controls a CRT television. It is the phone half of a
two-part system; the other half is [CRTHost](https://github.com/Adavidss/CRTHost),
which runs on a Raspberry Pi and renders everything the tube shows.

**The phone never renders the CRT interface. It only controls it.**

```bash
npm install
npm run dev          # http://localhost:3120
```

No Raspberry Pi required. It opens in simulation mode: a simulated host runs
inside the page, speaking the real protocol over the real transport interface,
so every screen is exercising the real code path — including the preview images,
which are genuinely rendered rather than mocked.

## What it does

Five tabs.

- **Home** — connection, what is on screen now, the live preview, recent apps.
- **Applications** — large cards, grouped by the category the host assigns.
  Tapping launches on the CRT.
- **Remote** — adapts to whatever is running. Pet meters and interactions, a
  gamepad while a game is up, transport controls for video, face pickers for the
  clock. Unknown applications fall back to a D-pad.
- **Settings** — split by who owns what: the CRT's display, palette, brightness,
  overscan and preview above; this phone's theme, haptics and connection below.
- **About** — host details, link diagnostics, and an explanation of why the
  division of labour is the way it is.

Games and Digital Pet get screens of their own, reached from Applications.

## It holds no state of its own

Everything about the CRT lives on the CRT. This app keeps a copy and never edits
it. A button that the host declines simply does not change, and a message
explains why.

That is why the pet gets hungry while your phone is in your pocket, and why two
phones can control the same CRT without coordinating. The one deliberate
exception is the media scrubber, which follows your finger during a drag and
sends a single seek on release — a bounded exception, documented where it lives.

## Design

Dark, one accent, hairlines rather than boxes. Every tappable thing presses the
same way and ticks the same way. Five themes; safe-area insets everywhere;
haptics on anything that changes something; a screen wake lock while it is open.
No component library and no icon pack — the icon set is drawn by hand, partly
because half of these glyphs (a CRT, a D-pad, a digital pet) do not exist in any
pack.

Total JavaScript is about 30 kB gzipped on top of React.

## Layout

```
src/protocol/    the wire contract, duplicated byte-for-byte from CRTHost
src/services/    HostConnection, transports, the simulated host
src/state/       connection wiring and this device's own settings
src/remotes/     one control surface per application, plus the registry
src/pages/       the five tabs and two sub-screens
src/components/  the design system
```

## Connecting to a real CRT

From CRTHost, with both repos cloned side by side:

```bash
npm --prefix ../CRTHost run serve
```

That builds both and serves them from one process, printing the address to open
on your phone. **No configuration is needed** — this app notices it was served
by the relay and points itself at the same address. Anything you choose by hand
afterwards is remembered and wins.

The one thing to know: **a page served over HTTPS cannot open `ws://` or
`http://`**. GitHub Pages forces HTTPS, so the hosted build is simulator-only by
construction, and the phone must load this app from the relay instead. The
settings screen detects the case and says so rather than letting the connection
fail with a network error nobody can act on. See
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

To point at a relay by hand: Settings → Connection → WebSocket, then the
address. **Detect** reuses the page's own origin, and **Test this address**
checks one you typed before committing to it.

## Scripts

| | |
|---|---|
| `npm run dev` | development server on :3120 |
| `npm run build` | typecheck, then build to `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | oxlint |
| `npm run check:protocol` | verify the shared source matches CRTHost |

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — the whole system, both halves
- [Communication model](docs/COMMUNICATION.md) — protocol, transports, the relay
- [Development](docs/DEVELOPMENT.md) — workflow and design conventions
- [Simulation mode](docs/SIMULATION.md) — how it works with no hardware
- [Deployment](docs/DEPLOYMENT.md) — GitHub Pages, and the HTTPS constraint
- [Adding a control surface](docs/ADDING_SURFACES.md)
