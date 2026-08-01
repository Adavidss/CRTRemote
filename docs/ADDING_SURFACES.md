# Adding a control surface

A *surface* is the set of controls the Remote tab shows while a particular
application is in front. The host names one in each application's descriptor
(`remote: "pet"`); this app maps that name to a component.

## You may not need one

An unknown surface name falls back to the D-pad, so a new application on the
host is controllable from the phone **before you write anything here**. The two
halves can be released independently — that is why the name is on the wire
rather than hard-coded in a list.

Reuse an existing one where it fits: `media` is the full transport control, and
several applications share it.

## Adding one

`src/remotes/RadioRemote.tsx`:

```tsx
import type { HostState } from "@/protocol";
import { send } from "@/state/connection.ts";
import { PadButton } from "@/components/ui/controls.tsx";

export function RadioRemote({ state }: { state: HostState }) {
  return (
    <section className="card p-4">
      <p className="t-label">Station</p>
      <p className="mt-1 truncate text-[17px] font-semibold">
        {state.apps.statusLine ?? "—"}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <PadButton
          icon="chevron-left"
          label="Previous"
          onPress={() => send({ type: "input.button", button: "left", phase: "press" })}
          className="py-4"
        />
        <PadButton
          icon="chevron-right"
          label="Next"
          onPress={() => send({ type: "input.button", button: "right", phase: "press" })}
          className="py-4"
        />
      </div>
    </section>
  );
}
```

`src/remotes/registry.ts`:

```ts
import { RadioRemote } from "./RadioRemote.tsx";

const SURFACES: Record<string, ComponentType<RemoteSurfaceProps>> = {
  /* … */
  radio: RadioRemote,
};
```

Done. The Remote tab picks it up whenever the host reports `remote: "radio"`.

Small surfaces can go in `simpleSurfaces.tsx` instead of a file of their own;
anything past a screenful should move out, as Pet, Games and Media have.

## Rules

**Read from `state`. Never keep a copy.** Every number on the screen comes from
the host. It is tempting to tick a meter locally so it moves smoothly; the first
time the host disagrees, the user is looking at two different truths and cannot
tell which is real.

The one sanctioned exception is a drag: a scrubber has to follow the finger or
it feels like a fight. Hold a local value **during the drag only**, send one
command on release, and go straight back to mirroring. See `MediaRemote`.

**Send, do not assume.** `send()` returns a command id; the connection tracks it
until acknowledged. A refused command is surfaced as a message; the control
stays where it was.

**Respect capabilities.** `identity.capabilities` says what the host can do.
Hide a control the host cannot honour rather than offering a button that
silently does nothing.

## Building blocks

`components/ui/controls.tsx` — `Button`, `PadButton`, `Segmented`, `Toggle`,
`Meter`, `Sheet`, `Row`, `RowGroup`, `Pill`, `EmptyState`, `Spinner`.
`remotes/DirectionalPad.tsx` — the D-pad, `SystemKeys`, `ShoulderKeys`.
`components/ui/Icon.tsx` — the icon set; add a path there rather than
introducing a second visual voice.

Directions must be held (`down` / `up`), not tapped — a menu that scrolls or a
game that moves is unusable otherwise. `PadButton`'s `onHold` / `onRelease`
handle the pointer leaving the element, which is the case that otherwise leaves
a button stuck down on the host.
