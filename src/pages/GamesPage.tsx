import { useMemo, useState } from "react";
import { navigate } from "@/router.ts";
import { send, useConnection } from "@/state/connection.ts";
import { ConnectionPill } from "@/components/ConnectionPill.tsx";
import { GameCard } from "@/components/GameCard.tsx";
import { Screen } from "@/components/Screen.tsx";
import { EmptyState, Pill, Segmented } from "@/components/ui/controls.tsx";
import { SYSTEM_LABELS } from "@/utils/format.ts";

/**
 * The library.
 *
 * It mirrors what the CRT shows — same order, same covers, same unavailable
 * entries — and then adds everything the television has no room for: system,
 * playtime, when it was last played, why a given entry cannot be launched. That
 * split is the whole argument for a companion screen.
 */

type Filter = "published" | "user" | "installed";

export function GamesPage() {
  const { state } = useConnection();
  const [filter, setFilter] = useState<Filter>("published");

  const games = useMemo(() => {
    const library = state?.games.library ?? [];
    if (filter === "user") return library.filter((game) => game.library === "user");
    if (filter === "installed") return library.filter((game) => game.playable);
    return library.filter((game) => game.library === "published");
  }, [state?.games.library, filter]);

  if (!state) {
    return (
      <Screen title="Games" onBack={() => navigate("apps")} trailing={<ConnectionPill />}>
        <EmptyState icon="games" title="Not connected" />
      </Screen>
    );
  }

  const missingCores = state.games.cores.filter((core) => !core.installed);

  return (
    <Screen
      title="Games"
      subtitle={`${state.games.library.filter((game) => game.playable).length} of ${state.games.library.length} ready to play`}
      onBack={() => navigate("apps")}
      trailing={<ConnectionPill />}
    >
      <Segmented<Filter>
        options={[
          { value: "published", label: "Published" },
          { value: "user", label: "Your library" },
          { value: "installed", label: "Playable" },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {games.length === 0 ? (
        <EmptyState
          icon="games"
          title={filter === "user" ? "Your library is empty" : "Nothing here yet"}
          detail={
            filter === "user"
              ? "Games you add to the host's user library will appear here."
              : "Add a games manifest to the host to populate this list."
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              active={game.id === state.games.activeGameId && state.games.session !== "stopped"}
              onPlay={() => {
                if (game.id === state.games.activeGameId && state.games.session !== "stopped") {
                  send({ type: "games.stop" });
                  return;
                }
                send({ type: "games.launch", gameId: game.id });
                navigate("remote");
              }}
            />
          ))}
        </div>
      )}

      {missingCores.length > 0 ? (
        <section className="card p-4">
          <p className="t-label">Emulator cores</p>
          <p className="mt-1 text-[13px] text-[var(--ink-3)]">
            {state.games.cores.filter((core) => core.installed).length} installed. Entries needing a missing core are
            listed but cannot be launched.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {state.games.cores.map((core) => (
              <Pill key={core.id} tone={core.installed ? "accent" : "muted"}>
                {SYSTEM_LABELS[core.system] ?? core.label}
              </Pill>
            ))}
          </div>
        </section>
      ) : null}
    </Screen>
  );
}
