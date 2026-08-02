import { useMemo, useState } from "react";
import type { GameEntry } from "@/protocol";
import { navigate } from "@/router.ts";
import { send, useConnection } from "@/state/connection.ts";
import { ConnectionPill } from "@/components/ConnectionPill.tsx";
import { LibraryList, LibraryRow, LibraryTabs } from "@/components/Library.tsx";
import { Screen } from "@/components/Screen.tsx";
import { EmptyState, Pill } from "@/components/ui/controls.tsx";
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

/**
 * The one line the television cannot spare room for.
 *
 * Why it will not launch takes precedence over anything else — that is the
 * question being asked when a row is greyed out.
 */
function describeGame(game: GameEntry): string | undefined {
  if (!game.playable) return game.unavailableReason ?? "Needs a core that is not installed";
  const parts: string[] = [];
  if (game.playSeconds >= 60) parts.push(`${Math.round(game.playSeconds / 60)} min played`);
  if (game.lastPlayedAt) parts.push(`last ${relativeDay(game.lastPlayedAt)}`);
  if (game.hasSave) parts.push("has a save");
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function relativeDay(at: number): string {
  const days = Math.floor((Date.now() - at) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return "a while ago";
}

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
      // No subtitle: it wrapped to three lines beside the pill, and the count
      // on the tabs row plus the "Playable" tab already answer it.
      onBack={() => navigate("apps")}
      trailing={<ConnectionPill />}
    >
      {/* Same shape as the applications list and the CRT's own launcher: title
          left, system right, one inverted bar on whatever is running. The
          second line still carries what the television has no room for — how
          long it has been played, whether there is a save, or why it cannot be
          launched — which was the argument for a companion screen in the first
          place, and is not something the layout has to give up. */}
      <LibraryTabs
        tabs={[
          { id: "published", label: "Published" },
          { id: "user", label: "Yours" },
          { id: "installed", label: "Playable" },
        ]}
        active={filter}
        onSelect={(id) => setFilter(id as Filter)}
        shown={games.length}
        total={state.games.library.length}
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
        <LibraryList>
          {games.map((game) => {
            const running = game.id === state.games.activeGameId && state.games.session !== "stopped";
            return (
              <LibraryRow
                key={game.id}
                title={game.title}
                kind={SYSTEM_LABELS[game.system] ?? game.system}
                detail={describeGame(game)}
                active={running}
                disabled={!game.playable}
                onSelect={() => {
                  // Tapping what is already running stops it, so one row is
                  // both the play and the stop control.
                  if (running) {
                    send({ type: "games.stop" });
                    return;
                  }
                  send({ type: "games.launch", gameId: game.id });
                  navigate("remote");
                }}
              />
            );
          })}
        </LibraryList>
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
