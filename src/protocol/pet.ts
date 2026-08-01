/**
 * Digital pet vocabulary.
 *
 * The simulation itself lives on the host and nowhere else. This file only
 * names the things a remote is allowed to ask for — deliberately kept in its
 * own module so that "the phone must never simulate the pet" is enforced by
 * there being nothing here to simulate it with.
 */

export const PET_ACTIONS = [
  "pet",
  "feed",
  "clean",
  "sleep",
  "wake",
  "play",
  "toy",
  "talk",
] as const;

export type PetAction = (typeof PET_ACTIONS)[number];

export interface PetActionDescriptor {
  action: PetAction;
  label: string;
  /** Icon key the remote maps to artwork. */
  icon: string;
  /** One line of "what will this do", shown under the button. */
  hint: string;
}

/**
 * Presentation metadata for the eight interactions. It lives in the shared
 * protocol rather than in the remote so that the labels on the phone and the
 * labels on the tube cannot drift apart.
 */
export const PET_ACTION_DESCRIPTORS: readonly PetActionDescriptor[] = [
  { action: "pet", label: "Pet", icon: "hand", hint: "A little affection" },
  { action: "feed", label: "Feed", icon: "bowl", hint: "Takes the edge off hunger" },
  { action: "clean", label: "Clean", icon: "sparkle", hint: "Tidy up the pen" },
  { action: "play", label: "Play", icon: "ball", hint: "Fun, but tiring" },
  { action: "toy", label: "Give toy", icon: "cube", hint: "Something to fiddle with" },
  { action: "talk", label: "Talk", icon: "speech", hint: "See what it says" },
  { action: "sleep", label: "Sleep", icon: "moon", hint: "Lights out" },
  { action: "wake", label: "Wake", icon: "sun", hint: "Rise and shine" },
];
