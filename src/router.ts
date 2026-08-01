import { useSyncExternalStore } from "react";

/**
 * Hash routing, hand-rolled.
 *
 * Seven screens and no nested layouts is not enough to justify a router
 * dependency, and the hash specifically is what makes this work on GitHub
 * Pages: a path-based route deep-linked and hard-refreshed would 404, because
 * Pages has no rewrite rule to send unknown paths back to `index.html`.
 */

export const ROUTES = ["home", "apps", "remote", "settings", "about", "games", "pet"] as const;
export type RouteName = (typeof ROUTES)[number];

export interface Route {
  name: RouteName;
  /** Everything after the route name: `#/games/native-beacon-run` → ["native-beacon-run"]. */
  segments: string[];
}

const DEFAULT: Route = { name: "home", segments: [] };

function parse(hash: string): Route {
  const clean = hash.replace(/^#\/?/, "").trim();
  if (clean.length === 0) return DEFAULT;
  const [head, ...segments] = clean.split("/").filter(Boolean);
  const name = ROUTES.find((route) => route === head);
  return name ? { name, segments } : DEFAULT;
}

let current = parse(typeof window === "undefined" ? "" : window.location.hash);
const listeners = new Set<() => void>();

function publish(): void {
  const next = parse(window.location.hash);
  if (next.name === current.name && next.segments.join("/") === current.segments.join("/")) return;
  current = next;
  for (const listener of listeners) listener();
}

if (typeof window !== "undefined") {
  window.addEventListener("hashchange", publish);
}

export function navigate(name: RouteName, ...segments: string[]): void {
  const target = `#/${[name, ...segments].join("/")}`;
  if (window.location.hash === target) return;
  window.location.hash = target;
}

/** Replace rather than push — for redirects that should not trap the back button. */
export function redirect(name: RouteName, ...segments: string[]): void {
  const target = `#/${[name, ...segments].join("/")}`;
  window.history.replaceState(null, "", target);
  publish();
}

export function useRoute(): Route {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => current,
  );
}

/** The five tabs, in bottom-navigation order. */
export const TABS: ReadonlyArray<{ route: RouteName; label: string; icon: string }> = [
  { route: "home", label: "Home", icon: "home" },
  { route: "apps", label: "Apps", icon: "grid" },
  { route: "remote", label: "Remote", icon: "remote" },
  { route: "settings", label: "Settings", icon: "settings" },
  { route: "about", label: "About", icon: "info" },
];

/**
 * Which tab should look active for a given route.
 *
 * Games and Pet are reached from Applications but are not tabs of their own —
 * without this the bottom bar would go blank the moment you opened one, which
 * reads as "you have left the app".
 */
export function tabFor(route: RouteName): RouteName {
  if (route === "games" || route === "pet") return "apps";
  return route;
}
