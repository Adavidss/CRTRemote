import type { ComponentType } from "react";
import type { HostState, RemoteSurfaceId } from "@/protocol";
import { GamesRemote } from "./GamesRemote.tsx";
import { MediaRemote } from "./MediaRemote.tsx";
import { PetRemote } from "./PetRemote.tsx";
import {
  AnimationsRemote,
  ClockRemote,
  DefaultRemote,
  LauncherRemote,
  PhotosRemote,
  VisualizerRemote,
  WeatherRemote,
} from "./simpleSurfaces.tsx";

/**
 * Which control surface belongs to which application.
 *
 * The host names a surface in each application's descriptor (`remote: "pet"`),
 * and this maps that name to a component. Two consequences worth stating:
 *
 *   • Adding controls for a new application is one entry here plus one file —
 *     nothing else in the remote needs to know it exists.
 *   • A host can ship an application whose surface this build has never heard
 *     of, and it still works, because an unknown name falls through to the
 *     D-pad rather than to a blank screen. The two halves can be released
 *     independently, which was the point of putting the name on the wire
 *     instead of hard-coding a list.
 */

export interface RemoteSurfaceProps {
  state: HostState;
}

const SURFACES: Record<string, ComponentType<RemoteSurfaceProps>> = {
  launcher: LauncherRemote,
  clock: ClockRemote,
  games: GamesRemote,
  pet: PetRemote,
  media: MediaRemote,
  photos: PhotosRemote,
  animations: AnimationsRemote,
  visualizer: VisualizerRemote,
  weather: WeatherRemote,
};

export function surfaceFor(id: RemoteSurfaceId | undefined): ComponentType<RemoteSurfaceProps> {
  if (!id || id === "none") return DefaultRemote;
  return SURFACES[id] ?? DefaultRemote;
}

/** Whether a bespoke surface exists, for the "generic controls" note. */
export function hasSurface(id: RemoteSurfaceId | undefined): boolean {
  return Boolean(id && id !== "none" && id in SURFACES);
}
