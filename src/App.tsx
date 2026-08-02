import { useEffect } from "react";
import { useRoute } from "@/router.ts";
import { applyConnection, connection } from "@/state/connection.ts";
import { consumePairingLink } from "@/state/pairingLink.ts";
import { applyTheme, useSettings } from "@/state/settings.ts";
import { useKeepAwake } from "@/hooks/useKeepAwake.ts";
import { BottomNav } from "@/components/BottomNav.tsx";
import { ConfirmSheet } from "@/components/ConfirmSheet.tsx";
import { Toasts } from "@/components/Toasts.tsx";
import { AboutPage } from "@/pages/AboutPage.tsx";
import { ApplicationsPage } from "@/pages/ApplicationsPage.tsx";
import { GamesPage } from "@/pages/GamesPage.tsx";
import { HomePage } from "@/pages/HomePage.tsx";
import { PetPage } from "@/pages/PetPage.tsx";
import { RemotePage } from "@/pages/RemotePage.tsx";
import { SettingsPage } from "@/pages/SettingsPage.tsx";

export default function App() {
  const route = useRoute();
  const settings = useSettings();

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    // A scanned pairing link writes the settings, which reconnects through the
    // settings subscription — so only connect here when there was not one.
    // Otherwise: one call, and working out *how* to reach the CRT is the
    // connection layer's job rather than something this component sequences.
    if (!consumePairingLink()) void applyConnection();
  }, []);

  // Coming back from a locked phone.
  //
  // The socket dies while the screen is off, and the backoff timer that would
  // rebuild it is suspended along with everything else — so without this the
  // remote comes back showing a stale picture and doing nothing when tapped,
  // which reads as the pairing having been lost. Reconnect on the way back in,
  // but only when the link is not already healthy, so glancing at another app
  // for a second does not tear down a perfectly good socket.
  useEffect(() => {
    const recover = () => {
      if (document.visibilityState !== "visible") return;
      if (connection.store.get().transport?.status !== "connected") void applyConnection(true);
    };
    document.addEventListener("visibilitychange", recover);
    window.addEventListener("online", recover);
    return () => {
      document.removeEventListener("visibilitychange", recover);
      window.removeEventListener("online", recover);
    };
  }, []);

  useKeepAwake(settings.keepAwake);

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* Keyed so a route change remounts the page and its entry animation
          plays — without it, navigating between two pages that share a
          component tree looks like the content simply swapped. */}
      <main key={route.name} className="min-h-0 flex-1">
        {renderRoute(route.name)}
      </main>

      <BottomNav />
      <Toasts />
      <ConfirmSheet />
    </div>
  );
}

function renderRoute(name: string) {
  switch (name) {
    case "apps":
      return <ApplicationsPage />;
    case "remote":
      return <RemotePage />;
    case "settings":
      return <SettingsPage />;
    case "about":
      return <AboutPage />;
    case "games":
      return <GamesPage />;
    case "pet":
      return <PetPage />;
    case "home":
    default:
      return <HomePage />;
  }
}
