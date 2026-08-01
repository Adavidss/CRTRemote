import { navigate } from "@/router.ts";
import { useConnection } from "@/state/connection.ts";
import { ConnectionPill } from "@/components/ConnectionPill.tsx";
import { PreviewCard } from "@/components/PreviewCard.tsx";
import { Screen } from "@/components/Screen.tsx";
import { Button, EmptyState } from "@/components/ui/controls.tsx";
import { hasSurface, surfaceFor } from "@/remotes/registry.ts";

/**
 * The controls for whatever is on screen.
 *
 * This screen has no content of its own — it looks up the active application's
 * surface and renders it. That is what makes "future applications can register
 * custom remote controls" true rather than aspirational: the page never learns
 * about a new application, the registry does.
 */
export function RemotePage() {
  const { state } = useConnection();

  if (!state) {
    return (
      <Screen title="Remote" trailing={<ConnectionPill />}>
        <EmptyState
          icon="remote"
          title="Not connected"
          detail="Controls appear once this remote is attached to a CRT."
          action={
            <Button tone="accent" icon="settings" onClick={() => navigate("settings")}>
              Open settings
            </Button>
          }
        />
      </Screen>
    );
  }

  if (state.display.mode === "computer") {
    return (
      <Screen title="Remote" trailing={<ConnectionPill />}>
        <EmptyState
          icon="monitor"
          title="Mirroring the computer"
          detail="The CRT is showing the connected computer, so its own controls are switched off."
        />
      </Screen>
    );
  }

  const active = state.apps.catalog.find((app) => app.id === state.apps.activeAppId);
  const Surface = surfaceFor(active?.remote);

  return (
    <Screen
      title={active?.title ?? "Remote"}
      subtitle={state.apps.statusLine ?? (hasSurface(active?.remote) ? undefined : "Generic controls")}
      trailing={<ConnectionPill />}
    >
      <Surface state={state} />
      <PreviewCard showControls={false} />
    </Screen>
  );
}
