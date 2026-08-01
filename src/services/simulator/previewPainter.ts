import type { HostState } from "@/protocol";

/**
 * Draws what the simulated CRT would be showing.
 *
 * The preview is the one part of the remote where a placeholder would have been
 * obviously fake — a grey rectangle labelled "preview" tells you nothing about
 * whether the feature works or whether the layout around it is right. So the
 * simulator actually renders the screen: same 320×240 buffer, same eight-level
 * ramp, same palette ids as the host. It is a different implementation from
 * CRTHost's renderer and does not try to match it pixel for pixel; it matches
 * it in kind, which is what the phone's UI needs to be designed against.
 */

const WIDTH = 320;
const HEIGHT = 240;

/** Same perceptual spacing as the host's ramp. */
const LEVELS = [0, 0.075, 0.16, 0.275, 0.42, 0.585, 0.78, 1];

const TINTS: Record<string, [number, number, number]> = {
  "p4-mono": [255, 251, 244],
  "p1-green": [126, 255, 148],
  "p3-amber": [255, 176, 66],
  "p7-blue": [186, 214, 255],
};

const COLOUR_RAMPS: Record<string, string[]> = {
  ember: ["#000000", "#1a0d20", "#3d1436", "#6b1f3f", "#a33341", "#d75f3a", "#f39c4a", "#ffe9b8"],
  seafoam: ["#000000", "#04141c", "#0a2b33", "#14494a", "#1f6f5f", "#39a07a", "#6fd39b", "#e2fff0"],
};

function ramp(paletteId: string, brightness: number): string[] {
  const preset = COLOUR_RAMPS[paletteId];
  if (preset) return preset;
  const tint = TINTS[paletteId] ?? TINTS["p4-mono"];
  const scale = Math.max(0.15, Math.min(1, brightness));
  return LEVELS.map((level) => {
    const r = Math.round(tint[0] * level * scale);
    const g = Math.round(tint[1] * level * scale);
    const b = Math.round(tint[2] * level * scale);
    return `rgb(${r},${g},${b})`;
  });
}

let canvas: HTMLCanvasElement | null = null;

function surface(): CanvasRenderingContext2D | null {
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
  }
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.imageSmoothingEnabled = false;
  return ctx;
}

export function paintPreview(state: HostState, now: number): string | null {
  const ctx = surface();
  if (!ctx) return null;

  const ink = ramp(state.display.paletteId, state.settings.brightness);
  ctx.fillStyle = ink[0];
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.font = "8px ui-monospace, Menlo, monospace";
  ctx.textBaseline = "top";

  const overscan = state.display.overscan;
  const safe = {
    x: Math.round(WIDTH * overscan),
    y: Math.round(HEIGHT * overscan),
    w: WIDTH - Math.round(WIDTH * overscan) * 2,
    h: HEIGHT - Math.round(HEIGHT * overscan) * 2,
  };

  switch (state.apps.activeAppId) {
    case "clock":
      paintClock(ctx, ink, safe, state, now);
      break;
    case "pet":
      paintPet(ctx, ink, safe, state, now);
      break;
    case "games":
      paintGames(ctx, ink, safe, state);
      break;
    case "animations":
      paintAnimations(ctx, ink, safe, now);
      break;
    case "photos":
      paintPhotos(ctx, ink, safe, now);
      break;
    case "videos":
      paintVideos(ctx, ink, safe, state);
      break;
    case "visualizer":
      paintVisualizer(ctx, ink, safe, now);
      break;
    case "weather":
      paintWeather(ctx, ink, safe, state);
      break;
    default:
      paintLauncher(ctx, ink, safe, state, now);
      break;
  }

  return canvas!.toDataURL("image/png");
}

type Rect = { x: number; y: number; w: number; h: number };

function header(ctx: CanvasRenderingContext2D, ink: string[], safe: Rect, left: string, right?: string): number {
  ctx.fillStyle = ink[7];
  ctx.fillText(left.toUpperCase(), safe.x, safe.y);
  if (right) {
    ctx.fillStyle = ink[4];
    ctx.textAlign = "right";
    ctx.fillText(right.toUpperCase(), safe.x + safe.w, safe.y);
    ctx.textAlign = "left";
  }
  ctx.fillStyle = ink[2];
  ctx.fillRect(safe.x, safe.y + 11, safe.w, 1);
  return safe.y + 16;
}

function paintLauncher(ctx: CanvasRenderingContext2D, ink: string[], safe: Rect, state: HostState, now: number): void {
  const top = header(ctx, ink, safe, state.identity.name, new Date(now).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
  const apps = state.apps.catalog.filter((app) => !app.hidden);
  const tile = 40;
  const gap = 8;
  const columns = 4;
  const gridWidth = columns * tile + (columns - 1) * gap;
  const gridX = safe.x + Math.floor((safe.w - gridWidth) / 2);

  apps.forEach((app, index) => {
    const x = gridX + (index % columns) * (tile + gap);
    const y = top + Math.floor(index / columns) * (tile + gap + 6);
    ctx.strokeStyle = ink[2];
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, tile - 1, tile - 1);
    ctx.fillStyle = ink[4];
    ctx.fillRect(x + 10, y + 10, tile - 20, tile - 20);
    ctx.fillStyle = ink[7];
    ctx.fillText(app.title.slice(0, 6).toUpperCase(), x + 2, y + tile - 10);
  });
}

function paintClock(ctx: CanvasRenderingContext2D, ink: string[], safe: Rect, state: HostState, now: number): void {
  const date = new Date(now);
  const hours = state.clock.format24h ? date.getHours() : date.getHours() % 12 || 12;
  const text = `${state.clock.format24h ? String(hours).padStart(2, "0") : hours}:${String(date.getMinutes()).padStart(2, "0")}${state.clock.showSeconds ? `:${String(date.getSeconds()).padStart(2, "0")}` : ""}`;

  ctx.fillStyle = ink[7];
  ctx.font = "bold 54px ui-monospace, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.fillText(text, safe.x + safe.w / 2, safe.y + safe.h / 2 - 34);

  if (state.clock.showDate) {
    ctx.font = "9px ui-monospace, Menlo, monospace";
    ctx.fillStyle = ink[4];
    ctx.fillText(
      date.toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" }).toUpperCase(),
      safe.x + safe.w / 2,
      safe.y + safe.h / 2 + 30,
    );
  }
  ctx.textAlign = "left";
  ctx.font = "8px ui-monospace, Menlo, monospace";
}

function paintPet(ctx: CanvasRenderingContext2D, ink: string[], safe: Rect, state: HostState, now: number): void {
  const pet = state.pet;
  header(ctx, ink, safe, pet.name, pet.stage);

  const floorY = safe.y + safe.h - 60;
  ctx.fillStyle = ink[2];
  for (let x = safe.x; x < safe.x + safe.w; x += 4) ctx.fillRect(x, floorY, 2, 1);

  // Body — breathing, so consecutive frames differ and the feed is visibly live.
  const breath = Math.sin(now / 900) * 2;
  const rx = 22;
  const ry = 18 + breath;
  const cx = safe.x + safe.w / 2;
  const cy = floorY - ry;

  ctx.fillStyle = ink[7];
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ink[4];
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx - 1, ry - 1, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = ink[0];
  for (const dx of [-8, 8]) {
    ctx.beginPath();
    if (pet.asleep) ctx.rect(cx + dx - 3, cy - 3, 6, 1);
    else ctx.arc(cx + dx, cy - 3, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  if (pet.message) {
    const width = Math.min(safe.w - 20, pet.message.length * 5 + 12);
    ctx.fillStyle = ink[0];
    ctx.fillRect(cx - width / 2, floorY - 76, width, 14);
    ctx.strokeStyle = ink[7];
    ctx.strokeRect(cx - width / 2 + 0.5, floorY - 75.5, width - 1, 13);
    ctx.fillStyle = ink[7];
    ctx.textAlign = "center";
    ctx.fillText(pet.message, cx, floorY - 72);
    ctx.textAlign = "left";
  }

  const meters: Array<[string, number]> = [
    ["FOOD", 1 - pet.hunger / 100],
    ["REST", pet.energy / 100],
    ["MOOD", pet.happiness / 100],
    ["TIDY", pet.cleanliness / 100],
    ["WELL", pet.health / 100],
    ["BOND", pet.friendship / 100],
  ];
  const half = Math.floor((safe.w - 8) / 2);
  meters.forEach(([label, value], index) => {
    const x = safe.x + (index % 2) * (half + 8);
    const y = floorY + 8 + Math.floor(index / 2) * 11;
    ctx.fillStyle = ink[4];
    ctx.fillText(label, x, y + 1);
    const barX = x + 30;
    const barW = half - 30;
    const cells = 10;
    const cell = Math.floor(barW / cells);
    for (let i = 0; i < cells; i += 1) {
      ctx.fillStyle = i < Math.round(value * cells) ? ink[6] : ink[2];
      ctx.fillRect(barX + i * cell, y, cell - 1, 7);
    }
  });
}

function paintGames(ctx: CanvasRenderingContext2D, ink: string[], safe: Rect, state: HostState): void {
  const top = header(ctx, ink, safe, "Games", `${state.games.library.filter((g) => g.playable).length}/${state.games.library.length} ready`);
  const coverW = 46;
  const coverH = 60;
  const columns = 5;
  const gridWidth = columns * coverW + (columns - 1) * 6;
  const gridX = safe.x + Math.floor((safe.w - gridWidth) / 2);

  state.games.library.slice(0, 10).forEach((game, index) => {
    const x = gridX + (index % columns) * (coverW + 6);
    const y = top + Math.floor(index / columns) * (coverH + 16);
    const seed = [...game.title].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);

    ctx.fillStyle = ink[game.playable ? 2 : 1];
    ctx.fillRect(x, y, coverW, coverH);
    ctx.fillStyle = ink[game.playable ? 4 : 2];
    for (let i = 0; i < 5; i += 1) {
      const bw = 6 + ((seed >> (i * 2)) % 20);
      ctx.fillRect(x + 2 + ((seed >> i) % Math.max(1, coverW - bw - 4)), y + 5 + i * 10, bw, 5);
    }
    ctx.fillStyle = ink[0];
    ctx.fillRect(x + 1, y + coverH - 12, coverW - 2, 11);
    ctx.fillStyle = ink[game.playable ? 7 : 3];
    ctx.fillText(game.title.split(" ")[0].slice(0, 6).toUpperCase(), x + 3, y + coverH - 10);

    ctx.strokeStyle = game.id === state.games.activeGameId ? ink[7] : ink[game.playable ? 3 : 1];
    ctx.strokeRect(x + 0.5, y + 0.5, coverW - 1, coverH - 1);
  });
}

function paintAnimations(ctx: CanvasRenderingContext2D, ink: string[], safe: Rect, now: number): void {
  for (let i = 0; i < 130; i += 1) {
    const depth = ((i * 37) % 100) / 100;
    const x = (((i * 61) % safe.w) + safe.w - ((now / (18 - depth * 12)) % safe.w)) % safe.w;
    const y = (i * 53) % safe.h;
    ctx.fillStyle = ink[depth > 0.75 ? 7 : depth > 0.45 ? 5 : depth > 0.2 ? 4 : 3];
    ctx.fillRect(safe.x + x, safe.y + y, 1, 1);
  }
}

function paintPhotos(ctx: CanvasRenderingContext2D, ink: string[], safe: Rect, now: number): void {
  // A dithered gradient, so the preview shows the stipple the real one has.
  const plate = { x: safe.x + 20, y: safe.y + 10, w: safe.w - 40, h: safe.h - 44 };
  const drift = Math.sin(now / 4000) * 0.15;
  for (let y = 0; y < plate.h; y += 1) {
    for (let x = 0; x < plate.w; x += 1) {
      const value = Math.min(1, Math.max(0, 0.9 - y / plate.h + drift + Math.sin(x * 0.05) * 0.08));
      const level = value * 7;
      const base = Math.floor(level);
      const threshold = (((y & 3) * 4 + (x & 3)) + 0.5) / 16;
      ctx.fillStyle = ink[Math.min(7, base + (level - base > threshold ? 1 : 0))];
      ctx.fillRect(plate.x + x, plate.y + y, 1, 1);
    }
  }
  ctx.strokeStyle = ink[3];
  ctx.strokeRect(plate.x - 0.5, plate.y - 0.5, plate.w + 1, plate.h + 1);
  ctx.fillStyle = ink[7];
  ctx.fillText("RIDGELINE", safe.x, safe.y + safe.h - 12);
}

function paintVideos(ctx: CanvasRenderingContext2D, ink: string[], safe: Rect, state: HostState): void {
  const stage = { x: safe.x, y: safe.y, w: safe.w, h: safe.h - 34 };
  const bars = 8;
  const barW = Math.floor(stage.w / bars);
  for (let i = 0; i < bars; i += 1) {
    ctx.fillStyle = ink[7 - i];
    ctx.fillRect(stage.x + i * barW, stage.y, barW, Math.floor(stage.h * 0.7));
  }
  for (let i = 0; i < bars; i += 1) {
    ctx.fillStyle = ink[i];
    ctx.fillRect(stage.x + i * barW, stage.y + Math.floor(stage.h * 0.7), barW, stage.h - Math.floor(stage.h * 0.7));
  }

  const media = state.media;
  ctx.fillStyle = ink[7];
  ctx.fillText((media.title ?? "").toUpperCase(), safe.x, safe.y + safe.h - 22);
  const progress = media.durationSeconds > 0 ? media.positionSeconds / media.durationSeconds : 0;
  ctx.fillStyle = ink[2];
  ctx.fillRect(safe.x, safe.y + safe.h - 10, safe.w, 3);
  ctx.fillStyle = ink[6];
  ctx.fillRect(safe.x, safe.y + safe.h - 10, Math.round(safe.w * progress), 3);
}

function paintVisualizer(ctx: CanvasRenderingContext2D, ink: string[], safe: Rect, now: number): void {
  const bands = 32;
  const width = Math.max(1, Math.floor(safe.w / bands));
  const bottom = safe.y + safe.h - 12;
  const height = safe.h - 24;
  const beat = ((now / 577) % 1);

  for (let i = 0; i < bands; i += 1) {
    const position = i / (bands - 1);
    const tilt = Math.pow(1 - position, 1.4);
    const value = Math.min(
      1,
      tilt * (0.3 + (Math.sin(now / 400 + i * 0.7) * 0.5 + 0.5) * 0.6) +
        (position < 0.18 ? Math.exp(-beat * 9) : 0),
    );
    const h = Math.round(value * height);
    for (let y = 0; y < h; y += 1) {
      const level = y / height;
      ctx.fillStyle = ink[level > 0.8 ? 7 : level > 0.55 ? 5 : level > 0.3 ? 4 : 3];
      ctx.fillRect(safe.x + i * width, bottom - y, width - 1, 1);
    }
  }
}

function paintWeather(ctx: CanvasRenderingContext2D, ink: string[], safe: Rect, state: HostState): void {
  const top = header(ctx, ink, safe, state.weather.location ?? "Weather", state.weather.updatedAt ? "UPDATED" : "NO DATA");
  const current = state.weather.current;
  if (!current) {
    ctx.fillStyle = ink[4];
    ctx.fillText("NO FORECAST", safe.x, top + 20);
    return;
  }

  ctx.fillStyle = ink[7];
  ctx.font = "bold 26px ui-monospace, Menlo, monospace";
  ctx.fillText(`${current.temp}°`, safe.x + 60, top + 8);
  ctx.font = "8px ui-monospace, Menlo, monospace";
  ctx.fillStyle = ink[5];
  ctx.fillText(current.label.toUpperCase(), safe.x + 60, top + 40);

  ctx.fillStyle = ink[6];
  ctx.beginPath();
  ctx.arc(safe.x + 26, top + 22, 14, 0, Math.PI * 2);
  ctx.fill();

  const columnWidth = Math.floor(safe.w / Math.max(1, state.weather.forecast.length));
  state.weather.forecast.forEach((day, index) => {
    const cx = safe.x + index * columnWidth + columnWidth / 2;
    ctx.textAlign = "center";
    ctx.fillStyle = ink[4];
    ctx.fillText(day.dayLabel, cx, top + 62);
    ctx.fillStyle = ink[7];
    ctx.fillText(`${day.high}°`, cx, top + 82);
    ctx.fillStyle = ink[3];
    ctx.fillText(`${day.low}°`, cx, top + 94);
    ctx.textAlign = "left";
  });
}
