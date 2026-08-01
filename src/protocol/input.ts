/**
 * Input is modelled as an abstract game controller, not as taps.
 *
 * The phone decides how to present a button (a D-pad, a big round "A", a list
 * row); the host only ever sees the button. That means the same host code
 * serves a touch remote, a USB gamepad plugged into the Pi, and a keyboard on
 * a development machine without a single branch.
 */

export const INPUT_BUTTONS = [
  "up",
  "down",
  "left",
  "right",
  "a",
  "b",
  "x",
  "y",
  "l",
  "r",
  "start",
  "select",
  "menu",
  "back",
] as const;

export type InputButton = (typeof INPUT_BUTTONS)[number];

/**
 * `press` is a complete down-then-up, which is what a tap on the phone sends.
 * Held inputs (a D-pad you keep your thumb on) send `down` and later `up`.
 */
export type InputPhase = "down" | "up" | "press";

export interface InputEvent {
  button: InputButton;
  phase: InputPhase;
  /** Host-clock time the host decided the event happened. */
  at: number;
}

export const DIRECTION_BUTTONS: readonly InputButton[] = ["up", "down", "left", "right"];

export function isDirection(button: InputButton): boolean {
  return DIRECTION_BUTTONS.includes(button);
}
