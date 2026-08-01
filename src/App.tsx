import { useEffect } from "react";
import { useRoute } from "@/router.ts";
import { applyConnection } from "@/state/connection.ts";
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
    void applyConnection();
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
