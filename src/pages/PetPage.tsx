import { useState } from "react";
import { navigate } from "@/router.ts";
import { send, useConnection } from "@/state/connection.ts";
import { ConnectionPill } from "@/components/ConnectionPill.tsx";
import { Screen } from "@/components/Screen.tsx";
import { Button, EmptyState, Sheet } from "@/components/ui/controls.tsx";
import { PetRemote } from "@/remotes/PetRemote.tsx";

/**
 * The pet, on its own screen.
 *
 * Reachable whether or not the pet is what the CRT is currently showing: the
 * simulation runs regardless, so being able to check on it — and feed it —
 * without taking the television away from whoever is using it is the behaviour
 * people will expect.
 */
export function PetPage() {
  const { state } = useConnection();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState("");

  if (!state) {
    return (
      <Screen title="Digital Pet" onBack={() => navigate("apps")} trailing={<ConnectionPill />}>
        <EmptyState icon="pet" title="Not connected" />
      </Screen>
    );
  }

  const onScreen = state.apps.activeAppId === "pet";

  return (
    <Screen
      title="Digital Pet"
      subtitle={onScreen ? "On screen now" : "Running in the background"}
      onBack={() => navigate("apps")}
      trailing={<ConnectionPill />}
    >
      {!onScreen ? (
        <Button
          icon="tv"
          fullWidth
          onClick={() => send({ type: "app.launch", appId: "pet" })}
          disabled={state.display.mode === "computer"}
        >
          Show on the CRT
        </Button>
      ) : null}

      <PetRemote state={state} />

      <Button
        tone="ghost"
        fullWidth
        onClick={() => {
          setDraft(state.pet.name);
          setRenaming(true);
        }}
      >
        Rename {state.pet.name}
      </Button>

      <Sheet open={renaming} onClose={() => setRenaming(false)} title={`Rename ${state.pet.name}`}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={12}
          autoFocus
          className="focus-ring w-full rounded-[var(--radius)] border border-[var(--hairline)] bg-[var(--bg-2)] px-4 py-3 text-[16px] text-[var(--ink)] outline-none"
          placeholder="Name"
        />
        <p className="mt-2 text-[12px] text-[var(--ink-4)]">Up to 12 characters.</p>
        <div className="mt-4 flex gap-3">
          <Button tone="plain" size="lg" fullWidth onClick={() => setRenaming(false)}>
            Cancel
          </Button>
          <Button
            tone="accent"
            size="lg"
            fullWidth
            disabled={draft.trim().length === 0}
            onClick={() => {
              send({ type: "pet.rename", name: draft.trim() });
              setRenaming(false);
            }}
          >
            Save
          </Button>
        </div>
      </Sheet>
    </Screen>
  );
}
