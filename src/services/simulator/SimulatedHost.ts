import {
  diffState,
  messageEnvelope,
  newId,
  PROTOCOL_VERSION,
  type ConfirmRequest,
  type HostMessage,
  type HostState,
  type HostStatePatch,
  type PetAction,
  type PetMood,
  type PreviewMode,
  type RemoteCommand,
  type Transport,
  type WireEnvelope,
} from "@/protocol";
import { paintPreview } from "./previewPainter.ts";
import { SIM_APP_CATALOG, SIM_CLOCK_FACES, SIM_CORES, SIM_GAMES, SIM_PALETTES } from "./fixtures.ts";

/**
 * A CRTHost that does not exist.
 *
 * It speaks the real protocol over a real transport and is, from the remote's
 * point of view, indistinguishable from the article: same handshake, same
 * patches, same acknowledgements, same confirmation flow, same preview frames.
 * Nothing in the UI knows which one it is talking to.
 *
 * That is what makes it worth building rather than stubbing the store. A stub
 * would let the screens be drawn; this lets the whole *system* be exercised —
 * a command that the host would refuse is refused here too, a mode switch still
 * has to be confirmed, and a preview that is switched off stops arriving.
 *
 * It is a simulation of a host, not of a pet: the phone still owns no
 * simulation of anything. Turn the simulator off and this file is unreachable.
 */

const TICK_MS = 1000;

export class SimulatedHost {
  private state: HostState;
  private transport: Transport | null = null;
  private detach: Array<() => void> = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private previewTimer: ReturnType<typeof setInterval> | null = null;
  private lastBroadcast: HostState | null = null;
  private pendingConfirm: { request: ConfirmRequest; resolve: (ok: boolean) => void } | null = null;
  private previewSequence = 0;
  private startedAt = Date.now();

  constructor() {
    this.state = initialState();
  }

  async attach(transport: Transport): Promise<void> {
    this.transport = transport;
    this.detach.push(transport.onFrame((envelope) => this.receive(envelope)));
    await transport.connect();

    this.timer = setInterval(() => this.tick(), TICK_MS);
    this.applyPreviewCadence();
  }

  stop(): void {
    for (const off of this.detach) off();
    this.detach = [];
    if (this.timer !== null) clearInterval(this.timer);
    if (this.previewTimer !== null) clearInterval(this.previewTimer);
    this.timer = null;
    this.previewTimer = null;
    this.transport?.disconnect();
    this.transport = null;
  }

  // — wire ————————————————————————————————————————————————————————

  private emit(message: HostMessage): void {
    this.transport?.send(messageEnvelope(message));
  }

  private receive(envelope: WireEnvelope): void {
    if (envelope.kind !== "command") return;
    void this.handle(envelope.command, envelope.id);
  }

  private patch(patch: HostStatePatch): void {
    const next: Record<string, unknown> = { ...this.state };
    for (const key of Object.keys(patch)) {
      const incoming = (patch as Record<string, unknown>)[key];
      if (incoming === undefined) continue;
      const current = next[key];
      next[key] =
        current && typeof current === "object" && !Array.isArray(current)
          ? { ...(current as object), ...(incoming as object) }
          : incoming;
    }
    this.state = next as unknown as HostState;
    this.broadcast();
  }

  private broadcast(): void {
    if (!this.lastBroadcast) {
      this.lastBroadcast = this.state;
      this.emit({ type: "state.full", state: this.state });
      return;
    }
    const delta = diffState(this.lastBroadcast, this.state);
    this.lastBroadcast = this.state;
    if (delta) this.emit({ type: "state.patch", patch: delta });
  }

  private async handle(command: RemoteCommand, commandId: string): Promise<void> {
    const answer = (ok: boolean, error?: string) =>
      this.emit(ok ? { type: "ack", commandId, ok: true } : { type: "ack", commandId, ok: false, error: error ?? "failed" });

    switch (command.type) {
      case "system.hello":
        this.lastBroadcast = null;
        this.emit({ type: "hello", identity: this.state.identity, protocolVersion: PROTOCOL_VERSION });
        this.emit({ type: "state.full", state: this.state });
        this.lastBroadcast = this.state;
        if (this.pendingConfirm) this.emit({ type: "confirm.request", request: this.pendingConfirm.request });
        return answer(true);

      case "system.requestState":
        this.lastBroadcast = this.state;
        this.emit({ type: "state.full", state: this.state });
        return answer(true);

      case "system.ping":
        this.emit({ type: "pong", at: command.at, hostTime: Date.now() });
        return answer(true);

      case "system.identify":
        this.emit({ type: "notice", level: "info", message: `This is ${this.state.identity.name}.` });
        return answer(true);

      case "system.setSetting":
        this.patch({ settings: { ...this.state.settings, [command.key]: command.value } });
        return answer(true);

      case "system.confirm": {
        const pending = this.pendingConfirm;
        if (pending && pending.request.id === command.requestId) {
          this.pendingConfirm = null;
          pending.resolve(command.accepted);
        }
        return answer(true);
      }

      case "app.launch": {
        const app = this.state.apps.catalog.find((entry) => entry.id === command.appId);
        if (!app?.available) return answer(false, `Cannot launch "${command.appId}".`);
        this.patch({
          apps: {
            activeAppId: app.id,
            runState: "running",
            statusLine: null,
            recentAppIds: [app.id, ...this.state.apps.recentAppIds.filter((id) => id !== app.id)].slice(0, 6),
          },
        });
        this.pushPreview();
        return answer(true);
      }

      case "app.exit":
        this.patch({ apps: { activeAppId: "home", runState: "running", statusLine: null } });
        this.pushPreview();
        return answer(true);

      case "app.pause":
        this.patch({ apps: { runState: "paused" } });
        return answer(true);

      case "app.resume":
        this.patch({ apps: { runState: "running" } });
        return answer(true);

      case "input.button":
        // Nothing here renders, so buttons only move the cursor conceptually.
        // Acknowledging them keeps the remote's in-flight tracking honest.
        return answer(true);

      case "input.pointer":
        return answer(true);

      case "display.setMode": {
        if (command.mode === this.state.display.mode) return answer(true);
        if (!command.confirmed) {
          const accepted = await this.ask({
            kind: "display-mode",
            title: command.mode === "computer" ? "Switch to computer display?" : "Return to CRT applications?",
            body:
              command.mode === "computer"
                ? "The CRT will mirror the connected computer and remote controls will be disabled until you switch back."
                : "The CRT will stop mirroring the computer and return to its own applications.",
            confirmLabel: command.mode === "computer" ? "Switch" : "Return",
            cancelLabel: "Cancel",
          });
          if (!accepted) return answer(false, "Cancelled.");
        }
        this.patch({
          display: { mode: command.mode, pendingMode: null },
          preview: { available: command.mode === "remote" },
        });
        return answer(true);
      }

      case "display.setPalette":
        this.patch({ display: { paletteId: command.paletteId } });
        this.pushPreview();
        return answer(true);

      case "display.setOverscan":
        this.patch({ display: { overscan: Math.max(0, Math.min(0.2, command.overscan)) } });
        this.pushPreview();
        return answer(true);

      case "preview.configure":
        this.patch({ preview: { mode: command.mode, intervalMs: intervalFor(command.mode) } });
        this.applyPreviewCadence();
        if (command.mode !== "off") this.pushPreview();
        return answer(true);

      case "preview.request":
        this.pushPreview();
        return answer(true);

      case "pet.interact":
        return answer(...this.petInteract(command.action));

      case "pet.rename": {
        const name = command.name.trim().slice(0, 12);
        if (!name) return answer(false, "That name is empty.");
        this.patch({ pet: { name } });
        return answer(true);
      }

      case "games.launch": {
        const game = this.state.games.library.find((entry) => entry.id === command.gameId);
        if (!game) return answer(false, "No such game.");
        if (!game.playable) return answer(false, game.unavailableReason ?? "This game cannot be launched.");
        this.patch({
          games: { activeGameId: game.id, session: "running", error: null },
          apps: { activeAppId: "games", runState: "running", statusLine: game.title },
        });
        this.pushPreview();
        return answer(true);
      }

      case "games.stop":
        this.patch({ games: { activeGameId: null, session: "stopped" } });
        return answer(true);

      case "games.pause":
        this.patch({ games: { session: "paused" } });
        return answer(true);

      case "games.resume":
        this.patch({ games: { session: "running" } });
        return answer(true);

      case "games.saveState": {
        const activeId = this.state.games.activeGameId;
        if (!activeId) return answer(false, "Nothing is running.");
        this.patch({
          games: {
            library: this.state.games.library.map((entry) =>
              entry.id === activeId ? { ...entry, hasSave: true } : entry,
            ),
          },
        });
        this.emit({ type: "notice", level: "success", message: "State saved." });
        return answer(true);
      }

      case "games.loadState":
        if (!this.state.games.activeGameId) return answer(false, "Nothing is running.");
        this.emit({ type: "notice", level: "success", message: "State restored." });
        return answer(true);

      case "media.control":
        return answer(...this.mediaControl(command.action, command.value));

      case "clock.configure": {
        const { faces: _ignored, ...patch } = command.patch;
        this.patch({ clock: { ...this.state.clock, ...patch } });
        this.pushPreview();
        return answer(true);
      }

      case "weather.refresh":
        this.patch({ weather: { ...this.state.weather, updatedAt: Date.now(), error: null } });
        return answer(true);

      default:
        return answer(false, `Unhandled command: ${(command as { type: string }).type}`);
    }
  }

  private ask(request: Omit<ConfirmRequest, "id" | "expiresAt">): Promise<boolean> {
    const full: ConfirmRequest = { ...request, id: newId(), expiresAt: Date.now() + 60_000 };
    this.patch({ display: { pendingMode: this.state.display.mode === "remote" ? "computer" : "remote" } });
    return new Promise<boolean>((resolve) => {
      this.pendingConfirm = {
        request: full,
        resolve: (accepted) => {
          this.patch({ display: { pendingMode: null } });
          resolve(accepted);
        },
      };
      this.emit({ type: "confirm.request", request: full });
    });
  }

  // — the simulation ——————————————————————————————————————————————

  private tick(): void {
    const now = Date.now();
    const pet = { ...this.state.pet };

    // Roughly the host's rates, compressed so an evening with the simulator
    // shows the meters actually moving.
    const hours = TICK_MS / 3_600_000;
    const speed = 40;
    pet.hunger = clamp(pet.hunger + 11 * hours * speed * (pet.asleep ? 0.35 : 1));
    pet.energy = clamp(pet.energy + (pet.asleep ? 22 : -7.5) * hours * speed);
    pet.cleanliness = clamp(pet.cleanliness - 5 * hours * speed);
    pet.ageSeconds += TICK_MS / 1000;

    if (pet.asleep && pet.energy >= 99) pet.asleep = false;
    if (!pet.asleep && pet.energy <= 2) pet.asleep = true;

    const target = clamp(70 - Math.max(0, pet.hunger - 50) * 0.7 + (pet.cleanliness - 50) * 0.25 + (pet.asleep ? 10 : 0));
    pet.happiness = clamp(pet.happiness + Math.sign(target - pet.happiness) * Math.min(4 * hours * speed, Math.abs(target - pet.happiness)));
    pet.health = clamp(pet.health + (pet.hunger > 85 || pet.cleanliness < 25 ? -3 : 1.5) * hours * speed);
    pet.mood = moodOf(pet.hunger, pet.energy, pet.happiness, pet.asleep, pet.sick);
    if (pet.message && pet.lastActionAt && now - pet.lastActionAt > 3000) pet.message = null;
    if (pet.busyUntil && now > pet.busyUntil) pet.busyUntil = null;

    // The wire contract says the meters are integers, and the remote renders
    // them straight. Rounding at the point of publication rather than in the UI
    // keeps the simulator honest about what a real host would actually send.
    for (const key of ["hunger", "energy", "health", "happiness", "cleanliness", "friendship"] as const) {
      pet[key] = Math.round(pet[key]);
    }
    pet.ageSeconds = Math.round(pet.ageSeconds);

    const media = { ...this.state.media };
    if (media.playing && media.durationSeconds > 0) {
      media.positionSeconds += 1;
      if (media.positionSeconds >= media.durationSeconds) {
        media.positionSeconds = media.repeat ? 0 : 0;
        media.index = media.repeat ? media.index : (media.index % media.count) + 1;
        media.title = REEL[(media.index - 1) % REEL.length].title;
        media.durationSeconds = REEL[(media.index - 1) % REEL.length].duration;
      }
    }

    this.patch({
      pet,
      media,
      time: { epochMs: now, timezone: this.state.time.timezone, uptimeMs: now - this.startedAt },
      apps: { statusLine: this.statusLine(pet.name, pet.mood) },
    });
  }

  private statusLine(petName: string, mood: PetMood): string | null {
    switch (this.state.apps.activeAppId) {
      case "clock":
        return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      case "pet":
        return `${petName} · ${mood}`;
      case "games": {
        const game = this.state.games.library.find((entry) => entry.id === this.state.games.activeGameId);
        return game ? game.title : "Library";
      }
      case "videos":
        return this.state.media.title ? `${this.state.media.playing ? "▶" : "❙❙"} ${this.state.media.title}` : null;
      case "weather":
        return this.state.weather.current ? `${this.state.weather.current.temp}° ${this.state.weather.current.label}` : null;
      default:
        return null;
    }
  }

  private petInteract(action: PetAction): [boolean, string?] {
    const now = Date.now();
    const pet = { ...this.state.pet };

    if (pet.asleep && action !== "wake" && action !== "talk") {
      return [false, `${pet.name} is fast asleep.`];
    }

    let message = "";
    switch (action) {
      case "pet":
        pet.happiness = clamp(pet.happiness + 7);
        pet.friendship = clamp(pet.friendship + 1.2);
        message = "Leans in.";
        break;
      case "feed":
        if (pet.hunger < 12) return [false, `${pet.name} isn't hungry.`];
        pet.hunger = clamp(pet.hunger - 38);
        pet.happiness = clamp(pet.happiness + 5);
        pet.cleanliness = clamp(pet.cleanliness - 4);
        message = "Munch munch.";
        break;
      case "clean":
        if (pet.cleanliness > 92) return [false, "Already spotless."];
        pet.cleanliness = 100;
        message = "Sparkling.";
        break;
      case "play":
        if (pet.energy < 18) return [false, "Too tired to play."];
        pet.happiness = clamp(pet.happiness + 16);
        pet.energy = clamp(pet.energy - 13);
        pet.hunger = clamp(pet.hunger + 7);
        message = "Chases it!";
        break;
      case "toy":
        pet.happiness = clamp(pet.happiness + 11);
        message = "Ooh, shiny.";
        break;
      case "talk":
        pet.friendship = clamp(pet.friendship + 0.6);
        message = pet.hunger > 75 ? "I'm starving." : pet.energy < 20 ? "So sleepy." : "Hello!";
        break;
      case "sleep":
        if (pet.energy > 88) return [false, "Not sleepy yet."];
        pet.asleep = true;
        message = "Curls up.";
        break;
      case "wake":
        if (!pet.asleep) return [false, "Already awake."];
        pet.asleep = false;
        message = "Stretches.";
        break;
    }

    pet.message = message;
    pet.lastAction = action;
    pet.lastActionAt = now;
    pet.busyUntil = now + 1200;
    pet.mood = moodOf(pet.hunger, pet.energy, pet.happiness, pet.asleep, pet.sick);
    this.patch({ pet });
    this.pushPreview();
    return [true];
  }

  private mediaControl(action: string, value?: number): [boolean, string?] {
    const media = { ...this.state.media };
    switch (action) {
      case "play":
        media.playing = true;
        break;
      case "pause":
        media.playing = false;
        break;
      case "toggle":
        media.playing = !media.playing;
        break;
      case "stop":
        media.playing = false;
        media.positionSeconds = 0;
        break;
      case "next":
        media.index = (media.index % media.count) + 1;
        media.positionSeconds = 0;
        media.title = REEL[(media.index - 1) % REEL.length].title;
        media.durationSeconds = REEL[(media.index - 1) % REEL.length].duration;
        break;
      case "previous":
        if (media.positionSeconds > 3) media.positionSeconds = 0;
        else {
          media.index = media.index <= 1 ? media.count : media.index - 1;
          media.positionSeconds = 0;
          media.title = REEL[(media.index - 1) % REEL.length].title;
          media.durationSeconds = REEL[(media.index - 1) % REEL.length].duration;
        }
        break;
      case "seek":
        media.positionSeconds = Math.max(0, Math.min(media.durationSeconds, value ?? 0));
        break;
      case "volume":
        media.volume = Math.max(0, Math.min(1, value ?? media.volume));
        if (media.volume > 0) media.muted = false;
        break;
      case "mute":
        media.muted = !media.muted;
        break;
      case "shuffle":
        media.shuffle = !media.shuffle;
        break;
      case "repeat":
        media.repeat = !media.repeat;
        break;
      default:
        return [false, `Unknown transport action: ${action}`];
    }
    this.patch({ media });
    return [true];
  }

  // — preview ——————————————————————————————————————————————————————

  private applyPreviewCadence(): void {
    if (this.previewTimer !== null) clearInterval(this.previewTimer);
    this.previewTimer = null;
    const interval = intervalFor(this.state.preview.mode);
    if (interval === 0) return;
    this.previewTimer = setInterval(() => this.pushPreview(), interval);
  }

  private pushPreview(): void {
    if (this.state.preview.mode === "off" || !this.state.preview.available) return;
    const image = paintPreview(this.state, Date.now());
    if (!image) return;
    this.previewSequence += 1;
    this.emit({
      type: "preview.frame",
      frame: {
        image,
        sequence: this.previewSequence,
        capturedAt: Date.now(),
        width: 320,
        height: 240,
        appId: this.state.apps.activeAppId,
      },
    });
    this.patch({ preview: { sequence: this.previewSequence, lastFrameAt: Date.now() } });
  }
}

const REEL = [
  { title: "Colour Bars", duration: 45 },
  { title: "Sweep & Grating", duration: 60 },
  { title: "Convergence Grid", duration: 30 },
];

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

function intervalFor(mode: PreviewMode): number {
  return mode === "high" ? 400 : mode === "low" ? 2000 : 0;
}

function moodOf(hunger: number, energy: number, happiness: number, asleep: boolean, sick: boolean): PetMood {
  if (asleep) return "sleeping";
  if (sick) return "sick";
  if (hunger > 75) return "hungry";
  if (energy < 20) return "tired";
  if (happiness < 30) return "sad";
  if (happiness < 55) return "bored";
  if (happiness > 88) return "excited";
  if (happiness > 70) return "happy";
  return "content";
}

function initialState(): HostState {
  const now = Date.now();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    protocolVersion: PROTOCOL_VERSION,
    identity: {
      id: "simulated-host",
      name: "Simulated CRT",
      version: "0.1.0",
      protocolVersion: PROTOCOL_VERSION,
      model: "Simulator",
      capabilities: ["preview", "computer-display-mode", "emulation", "video", "weather"],
    },
    time: { epochMs: now, timezone, uptimeMs: 0 },
    display: {
      mode: "remote",
      width: 320,
      height: 240,
      outputWidth: 640,
      outputHeight: 480,
      overscan: 0.06,
      paletteId: "p4-mono",
      palettes: SIM_PALETTES,
      pendingMode: null,
    },
    apps: {
      catalog: SIM_APP_CATALOG,
      activeAppId: "home",
      runState: "running",
      statusLine: null,
      recentAppIds: ["pet", "clock"],
    },
    preview: { mode: "off", intervalMs: 0, sequence: 0, lastFrameAt: null, available: true },
    pet: {
      name: "Pixel",
      species: "Blip",
      ageSeconds: 8 * 3600,
      stage: "child",
      mood: "content",
      hunger: 34,
      energy: 72,
      health: 96,
      happiness: 68,
      cleanliness: 81,
      friendship: 24,
      asleep: false,
      sick: false,
      message: null,
      lastAction: null,
      lastActionAt: null,
      busyUntil: null,
    },
    games: { library: SIM_GAMES, cores: SIM_CORES, activeGameId: null, session: "stopped", error: null },
    media: {
      kind: "video",
      title: REEL[0].title,
      playing: false,
      positionSeconds: 0,
      durationSeconds: REEL[0].duration,
      volume: 0.7,
      muted: false,
      index: 1,
      count: REEL.length,
      shuffle: false,
      repeat: false,
    },
    clock: {
      faceId: "segments",
      faces: SIM_CLOCK_FACES,
      format24h: false,
      showSeconds: true,
      showDate: true,
      timezone,
    },
    weather: {
      location: "Washington, DC",
      updatedAt: now,
      units: "metric",
      current: { temp: 24, code: 2, label: "Partly cloudy", windKph: 11 },
      forecast: [
        { dayLabel: "TODAY", high: 26, low: 17, code: 2 },
        { dayLabel: "THU", high: 28, low: 19, code: 0 },
        { dayLabel: "FRI", high: 25, low: 18, code: 61 },
        { dayLabel: "SAT", high: 22, low: 16, code: 63 },
        { dayLabel: "SUN", high: 24, low: 15, code: 3 },
      ],
      error: null,
    },
    settings: {
      brightness: 1,
      volume: 0.7,
      idleTimeoutMinutes: 12,
      burnInProtection: true,
      attractMode: false,
    },
  };
}
