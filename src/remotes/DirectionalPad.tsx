import type { InputButton } from "@/protocol";
import { send } from "@/state/connection.ts";
import { PadButton } from "@/components/ui/controls.tsx";
import { Icon } from "@/components/ui/Icon.tsx";
import { cn } from "@/utils/cn.ts";

/**
 * The D-pad, used by every surface that needs one.
 *
 * Directions are held: press sends `down`, release sends `up`, and the host
 * repeats for as long as it is held — which is the only way a menu that scrolls
 * or a game that moves is usable. Face buttons send a single `press`, because a
 * tap is a complete action and making the phone send two frames for it would
 * double the traffic for nothing.
 */
const hold = (button: InputButton) => send({ type: "input.button", button, phase: "down" });
const release = (button: InputButton) => send({ type: "input.button", button, phase: "up" });
const press = (button: InputButton) => send({ type: "input.button", button, phase: "press" });

export function DirectionalPad({
  faceButtons = ["a", "b"],
  className,
}: {
  faceButtons?: InputButton[];
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-6", className)}>
      <div className="grid w-[168px] shrink-0 grid-cols-3 grid-rows-3 gap-1.5">
        <span />
        <PadButton
          label="Up"
          hideLabel
          onHold={() => hold("up")}
          onRelease={() => release("up")}
          className="aspect-square"
          icon="chevron-down"
          iconClassName="rotate-180"
        />
        <span />
        <PadButton
          label="Left"
          hideLabel
          onHold={() => hold("left")}
          onRelease={() => release("left")}
          className="aspect-square"
          icon="chevron-left"
        />
        <div className="flex items-center justify-center">
          <span className="h-2 w-2 rounded-none bg-[var(--ink-4)]" />
        </div>
        <PadButton
          label="Right"
          hideLabel
          onHold={() => hold("right")}
          onRelease={() => release("right")}
          className="aspect-square"
          icon="chevron-right"
        />
        <span />
        <PadButton
          label="Down"
          hideLabel
          onHold={() => hold("down")}
          onRelease={() => release("down")}
          className="aspect-square"
          icon="chevron-down"
        />
        <span />
      </div>

      <div className="flex flex-1 flex-col items-end gap-2">
        <div className="flex gap-2">
          {faceButtons.map((button) => (
            <button
              key={button}
              type="button"
              onClick={() => press(button)}
              className={cn(
                "pressable focus-ring flex h-16 w-16 items-center justify-center rounded-none text-[18px] font-bold",
                button === "a"
                  ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                  : "border border-[var(--hairline)] bg-[var(--surface-2)] text-[var(--ink)]",
              )}
            >
              {button.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <SmallKey label="Menu" onPress={() => press("menu")} />
          <SmallKey label="Back" onPress={() => press("back")} />
        </div>
      </div>
    </div>
  );
}

function SmallKey({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="pressable focus-ring rounded-none border border-[var(--hairline)] bg-[var(--surface-2)] px-3.5 py-2 text-[12px] font-medium text-[var(--ink-2)]"
    >
      {label}
    </button>
  );
}

/** Start / Select, for the surfaces that want them separated out. */
export function SystemKeys() {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => press("select")}
        className="pressable focus-ring flex-1 rounded-none border border-[var(--hairline)] bg-[var(--surface-2)] py-2.5 text-[13px] text-[var(--ink-2)]"
      >
        Select
      </button>
      <button
        type="button"
        onClick={() => press("start")}
        className="pressable focus-ring flex-1 rounded-none border border-[var(--hairline)] bg-[var(--surface-2)] py-2.5 text-[13px] text-[var(--ink-2)]"
      >
        Start
      </button>
    </div>
  );
}

/** Shoulder buttons, for the game surface. */
export function ShoulderKeys() {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => press("l")}
        className="pressable focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius)] border border-[var(--hairline)] bg-[var(--surface-2)] py-3 text-[13px] font-semibold text-[var(--ink-2)]"
      >
        <Icon name="chevron-left" size={15} /> L
      </button>
      <button
        type="button"
        onClick={() => press("r")}
        className="pressable focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius)] border border-[var(--hairline)] bg-[var(--surface-2)] py-3 text-[13px] font-semibold text-[var(--ink-2)]"
      >
        R <Icon name="chevron-right" size={15} />
      </button>
    </div>
  );
}
