import { navigate } from "@/router.ts";
import { send, useConnection } from "@/state/connection.ts";
import { AppTile } from "@/components/AppTile.tsx";
import { ConnectionPill } from "@/components/ConnectionPill.tsx";
import { Screen } from "@/components/Screen.tsx";
import { EmptyState } from "@/components/ui/controls.tsx";

/**
 * The launcher.
 *
 * Grouped by the category the host assigns, because nine flat cards is a wall
 * and four groups of two or three is a list you can read. Tapping launches on
 * the CRT; the two applications with a screen of their own here (Games, Pet)
 * open that screen as well, since launching them and then having to find their
 * controls would be two taps for one intention.
 */

const GROUPS: Array<{ id: string; label: string }> = [
  { id: "play", label: "Play" },
  { id: "media", label: "Media" },
  { id: "info", label: "Information" },
  { id: "system", label: "System" },
];

/**
 * Launching also opens the screen that goes with it. Games and Digital Pet have
 * screens of their own; everything else lands on the Remote tab. Launching and
 * then having to find the controls would be two taps for one intention.
 */
function launch(id: string): void {
  send({ type: "app.launch", appId: id });
  if (id === "games") navigate("games");
  else if (id === "pet") navigate("pet");
  else navigate("remote");
}

export function ApplicationsPage() {
  const { state } = useConnection();

  if (!state) {
    return (
      <Screen title="Applications" trailing={<ConnectionPill />}>
        <EmptyState icon="grid" title="Not connected" detail="Connect to a CRT to see what it can run." />
      </Screen>
    );
  }

  const visible = state.apps.catalog.filter((app) => !app.hidden);
  const disabled = state.display.mode === "computer";

  return (
    <Screen
      title="Applications"
      subtitle={disabled ? "Unavailable while mirroring the computer" : `${visible.length} on this CRT`}
      trailing={<ConnectionPill />}
    >
      {GROUPS.map((group) => {
        const apps = visible.filter((app) => app.category === group.id);
        if (apps.length === 0) return null;
        return (
          <section key={group.id}>
            <p className="t-label mb-2 px-1">{group.label}</p>
            <div className="grid grid-cols-2 gap-3">
              {apps.map((app) => (
                <AppTile
                  key={app.id}
                  app={disabled ? { ...app, available: false, unavailableReason: "Mirroring the computer" } : app}
                  active={app.id === state.apps.activeAppId}
                  onSelect={() => launch(app.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </Screen>
  );
}
