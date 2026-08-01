# Development

```bash
npm install
npm run dev            # :3120
```

Opens in simulation mode against a simulated host running in the page. No
Raspberry Pi, no relay, no CRTHost.

Use a narrow viewport — this is a phone application, and a 402 px-wide window is
the honest way to look at it. Settings → Theme changes the accent live.

## Against a real host

Three processes:

```bash
npm --prefix ../CRTHost run relay      # :7890
npm --prefix ../CRTHost run dev        # :3110 → header → "WebSocket relay"
npm run dev                            # :3120
```

Then Settings → Connection → **WebSocket**, address `localhost`, port `7890`.
The connection pill turns from amber *Simulated* to green with the host's name
and a round-trip time.

## Layout

```
src/protocol/    the contract. Duplicated from CRTHost — do not edit alone.
src/services/    HostConnection, transports, simulator
src/state/       connection.ts wires the transport; settings.ts is this device's own
src/remotes/     one file per control surface, plus registry.ts
src/pages/       one per route
src/components/  ui/ is the primitives; the rest are composed pieces
src/router.ts    a hash router, about sixty lines
```

## State

Two stores, both `useSyncExternalStore` over a thirty-line `createStore`:

- `connection.store` — everything from the host. Read with `useHostState()` or
  `useConnection()`. **Never written to.**
- `settingsStore` — this device's preferences, persisted to `localStorage`.

`useSyncExternalStore` rather than `useEffect` + `setState` because the data
arrives from outside React entirely, and it is the API that gets tearing right
during concurrent rendering.

Sending is one function:

```ts
import { send } from "@/state/connection.ts";
send({ type: "app.launch", appId: "pet" });
```

Commands in flight are tracked so a control can dim while its acknowledgement is
outstanding. That is optimism about the *transition*, never about the result.

## Design conventions

Tokens live in `src/index.css`. Use the variables, not literals — the theme
picker is a single attribute on `<html>` and hard-coded colours break it.

| | |
|---|---|
| Surfaces | `--bg` `--surface` `--surface-2` `--surface-3`, lighter as they come forward |
| Ink | `--ink` `--ink-2` `--ink-3` `--ink-4` |
| Accent | `--accent` and friends. **One** accent; it is what carries meaning. |
| Edges | `--hairline`, not borders |
| Radius | `--radius-sm` … `--radius-xl` |
| Motion | `--ease`, `--ease-spring`. One easing for everything. |

Rules worth keeping:

- Everything tappable gets `.pressable`. A press is a scale, not a colour
  change — colour changes read as state, and most taps are not state.
- Haptics on anything that changes something. `haptic("tick" | "select" |
  "confirm" | "warn")`.
- Numbers that change every second get `.t-tabular`, or the layout jitters.
- Fixed edges pay back `env(safe-area-inset-*)`. `.pt-safe` / `.pb-safe`.
- Never a true `#000` — next to an OLED phone's own black it reads as a hole in
  the screen.
- Respect `prefers-reduced-motion`; the stylesheet already does.

## Checks

```bash
npm run typecheck
npm run lint
npm run check:protocol     # only meaningful with CRTHost cloned alongside
npm run build
```

`check:protocol` compares `src/protocol/` and `src/services/transports/` against
CRTHost and fails on any difference.
