import { useState } from "react";
import type { AppDescriptor } from "@/protocol";
import { navigate } from "@/router.ts";
import { send, useConnection } from "@/state/connection.ts";
import { ConnectionPill } from "@/components/ConnectionPill.tsx";
import { CATEGORY_LABELS, LibraryList, LibraryRow, LibraryTabs } from "@/components/Library.tsx";
import { Screen } from "@/components/Screen.tsx";
import { EmptyState } from "@/components/ui/controls.tsx";

/**
 * The launcher, as a library.
 *
 * This was a two-column wall of pictorial cards. The CRT's own launcher is a
 * ruled list — name left, kind right, an inverted bar on whatever is running —
 * and having the phone show something structurally different made them read as
 * two products rather than two ends of one. Same layout, same categories, same
 * `N/M` readout; only the row height changes, because a thumb is not a cursor.
 *
 * Tapping launches on the CRT. The two applications with a screen of their own
 * here (Games, Pet) open that screen too, since launching and then having to
 * find the controls would be two taps for one intention.
 */

function launch(id: string): void {
  send({ type: "app.launch", appId: id });
  if (id === "games") navigate("games");
  else if (id === "pet") navigate("pet");
  else navigate("remote");
}

function kindOf(app: AppDescriptor): string {
  return CATEGORY_LABELS[app.category] ?? app.category.toUpperCase();
}

export function ApplicationsPage() {
  const { state } = useConnection();
  const [tab, setTab] = useState("all");

  if (!state) {
    return (
      <Screen title="Applications" trailing={<ConnectionPill />}>
        <EmptyState icon="grid" title="Not connected" detail="Connect to a CRT to see what it can run." />
      </Screen>
    );
  }

  const visible = state.apps.catalog.filter((app) => !app.hidden);
  const mirroring = state.display.mode === "computer";

  // Tabs come from what is installed rather than a fixed list, so a new
  // application brings its category with it — same rule as the host.
  const categories: string[] = [];
  for (const app of visible) {
    if (!categories.includes(app.category)) categories.push(app.category);
  }
  const tabs = [
    { id: "all", label: "All" },
    ...categories.map((category) => ({ id: category, label: CATEGORY_LABELS[category] ?? category })),
  ];

  const entries = tab === "all" ? visible : visible.filter((app) => app.category === tab);

  return (
    <Screen
      // "Applications" wraps to two lines beside the connection pill: twelve
      // upper-case monospace characters do not fit a phone with anything next
      // to them. The bottom bar calls this Apps too.
      title="Apps"
      subtitle={mirroring ? "Unavailable while mirroring the computer" : undefined}
      trailing={<ConnectionPill />}
    >
      <LibraryTabs
        tabs={tabs}
        active={tab}
        onSelect={setTab}
        shown={entries.length}
        total={visible.length}
      />

      <LibraryList>
        {entries.map((app) => (
          <LibraryRow
            key={app.id}
            title={app.title}
            kind={kindOf(app)}
            detail={app.available ? app.description : (app.unavailableReason ?? "Unavailable")}
            active={app.id === state.apps.activeAppId && !mirroring}
            disabled={mirroring || !app.available}
            onSelect={() => launch(app.id)}
          />
        ))}
      </LibraryList>

      {entries.length === 0 ? (
        <p className="px-1 text-[13px] text-[var(--ink-3)]">Nothing in this category.</p>
      ) : null}
    </Screen>
  );
}
