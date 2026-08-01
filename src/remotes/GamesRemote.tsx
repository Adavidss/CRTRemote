import type { HostState } from "@/protocol";
import { navigate } from "@/router.ts";
import { send } from "@/state/connection.ts";
import { Cover } from "@/components/GameCard.tsx";
import { Button, EmptyState, Pill } from "@/components/ui/controls.tsx";
import { DirectionalPad, ShoulderKeys, SystemKeys } from "./DirectionalPad.tsx";

/**
 * The games surface, which is two different screens.
 *
 * With a game running it is a controller and nothing else — no lists, no
 * navigation, nothing that competes with the thumbs. With nothing running it is
 * a way into the library. Showing both at once would mean the controller is
 * never where your thumb expects it.
 */
export function GamesRemote({ state }: { state: HostState }) {
  const active = state.games.library.find((game) => game.id === state.games.activeGameId);
  const running = active && state.games.session !== "stopped";

  if (!running) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState
          icon="games"
          title="No game running"
          detail="Pick something from the library and the controller appears here."
          action={
            <Button tone="accent" icon="games" onClick={() => navigate("games")}>
              Open the library
            </Button>
          }
        />
        {state.games.error ? (
          <p className="rounded-[var(--radius)] border border-[var(--danger)]/30 bg-[var(--danger)]/8 px-4 py-3 text-[13px] text-[var(--danger)]">
            {state.games.error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="card flex items-center gap-3 p-3">
        <Cover game={active} size={54} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold">{active.title}</p>
          <p className="mt-0.5 truncate text-[12px] text-[var(--ink-3)]">
            {state.apps.statusLine ?? "Running"}
          </p>
        </div>
        <Pill tone={state.games.session === "paused" ? "warn" : "accent"}>{state.games.session}</Pill>
      </section>

      <section className="card flex flex-col gap-4 p-4">
        <DirectionalPad faceButtons={["b", "a"]} />
        <ShoulderKeys />
        <SystemKeys />
      </section>

      <section className="grid grid-cols-3 gap-2">
        <Button
          icon="save"
          onClick={() => send({ type: "games.saveState" })}
          className="flex-col !h-auto py-3 text-[12px]"
        >
          Save
        </Button>
        <Button
          icon="refresh"
          disabled={!active.hasSave}
          onClick={() => send({ type: "games.loadState" })}
          className="flex-col !h-auto py-3 text-[12px]"
        >
          Load
        </Button>
        <Button
          icon="stop"
          tone="danger"
          onClick={() => send({ type: "games.stop" })}
          className="flex-col !h-auto py-3 text-[12px]"
        >
          Stop
        </Button>
      </section>
    </div>
  );
}
