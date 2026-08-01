import { PET_ACTION_DESCRIPTORS, type HostState, type PetAction } from "@/protocol";
import { send, useConnection } from "@/state/connection.ts";
import { Meter, PadButton, Pill } from "@/components/ui/controls.tsx";
import { appIcon, Icon, type IconName } from "@/components/ui/Icon.tsx";
import { formatAge } from "@/utils/format.ts";
import { cn } from "@/utils/cn.ts";

/**
 * Pet controls.
 *
 * Every number on this screen came from the host and none of it is computed
 * here. That is the rule the whole system is built on, and this is where it
 * would be most tempting to break: it would be easy to tick the hunger bar
 * locally so it moves smoothly, and the first time the host disagreed the user
 * would be looking at a pet that is hungry on the phone and fed on the
 * television.
 */

const ACTION_ICONS: Record<PetAction, IconName> = {
  pet: "hand",
  feed: "bowl",
  clean: "sparkle",
  play: "ball",
  toy: "cube",
  talk: "speech",
  sleep: "moon",
  wake: "sun",
};

const MOOD_COPY: Record<string, string> = {
  happy: "Happy",
  content: "Content",
  bored: "A bit bored",
  sad: "Sad",
  hungry: "Hungry",
  tired: "Tired",
  sick: "Unwell",
  sleeping: "Asleep",
  excited: "Excited",
};

export function PetRemote({ state }: { state: HostState }) {
  const { pending } = useConnection();
  const pet = state.pet;
  const busy = pet.busyUntil !== null && pet.busyUntil > Date.now();
  const inFlight = pending.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <section className="card p-4">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px]",
              pet.sick ? "bg-[var(--danger)]/12 text-[var(--danger)]" : "bg-[var(--accent-soft)] text-[var(--accent)]",
            )}
          >
            <Icon name={appIcon("pet")} size={28} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-[19px] font-semibold">{pet.name}</p>
              <Pill tone={pet.sick ? "danger" : pet.asleep ? "muted" : "accent"}>
                {MOOD_COPY[pet.mood] ?? pet.mood}
              </Pill>
            </div>
            <p className="mt-0.5 text-[13px] text-[var(--ink-3)]">
              {pet.species} · {pet.stage} · {formatAge(pet.ageSeconds)} old
            </p>
          </div>
        </div>

        {/* The speech bubble is host-authored text; the phone never invents a line. */}
        {pet.message ? (
          <p className="animate-rise mt-3 rounded-[var(--radius)] border border-[var(--hairline)] bg-[var(--bg-2)] px-3 py-2 text-[14px] italic text-[var(--ink)]">
            “{pet.message}”
          </p>
        ) : null}
      </section>

      <section className="card flex flex-col gap-4 p-4">
        {/* Rounded here as well as on the host: the contract says these are
            integers, but a percentage is the one place where trusting a peer to
            have kept its promise is visible to the user as forty decimal
            places. */}
        <Meter
          label="Food"
          detail={`${Math.round(100 - pet.hunger)}%`}
          value={1 - pet.hunger / 100}
          tone={pet.hunger > 75 ? "danger" : pet.hunger > 55 ? "warn" : "accent"}
        />
        <Meter
          label="Rest"
          detail={`${Math.round(pet.energy)}%`}
          value={pet.energy / 100}
          tone={pet.energy < 20 ? "warn" : "accent"}
        />
        <Meter
          label="Mood"
          detail={`${Math.round(pet.happiness)}%`}
          value={pet.happiness / 100}
          tone={pet.happiness < 35 ? "warn" : "accent"}
        />
        <Meter
          label="Tidy"
          detail={`${Math.round(pet.cleanliness)}%`}
          value={pet.cleanliness / 100}
          tone={pet.cleanliness < 25 ? "danger" : "accent"}
        />
        <Meter
          label="Health"
          detail={`${Math.round(pet.health)}%`}
          value={pet.health / 100}
          tone={pet.sick ? "danger" : "accent"}
        />
        <Meter label="Bond" detail={`${Math.round(pet.friendship)}%`} value={pet.friendship / 100} tone="muted" />
      </section>

      <section>
        <p className="t-label mb-2 px-1">Interact</p>
        <div className="grid grid-cols-4 gap-2">
          {PET_ACTION_DESCRIPTORS.map((descriptor) => {
            // Sleep and wake are the same slot: only one of them is ever the
            // sensible thing to do, and showing both makes the user work out
            // which.
            if (descriptor.action === "sleep" && pet.asleep) return null;
            if (descriptor.action === "wake" && !pet.asleep) return null;
            const blocked = pet.asleep && descriptor.action !== "wake" && descriptor.action !== "talk";
            return (
              <PadButton
                key={descriptor.action}
                icon={ACTION_ICONS[descriptor.action]}
                label={descriptor.label}
                disabled={blocked || busy || inFlight}
                onPress={() => send({ type: "pet.interact", action: descriptor.action })}
                className="aspect-square"
              />
            );
          })}
        </div>
        <p className="mt-2 px-1 text-[11px] text-[var(--ink-4)]">
          {pet.asleep
            ? `${pet.name} is asleep — wake them first.`
            : busy
              ? "Busy…"
              : "The CRT runs the simulation; this only sends the request."}
        </p>
      </section>
    </div>
  );
}
