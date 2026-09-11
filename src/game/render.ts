import { AFFIXES, COLS, MAX_UPGRADE, ROWS, rangeAt, towerForm, type PropKind } from "./config.ts";
import { type Creep, type EmberEngine, type Tower } from "./engine.ts";
import { drawSprite, spr } from "./sprites.ts";

const PATH_EDGE = "#4a3a22";
const PARCHMENT = "#e8dcc4";
const COPPER = "#d4a054";
const EMBER = "#e07838";
const FROST = "#6aa8b4";
const BLOOD = "#c45c4a";
const STONE = "#4a5244";
const STONE_LIT = "#6a7460";

function nsin(t: number, seed: number) {
  return Math.sin(t * seed) * 0.55 + Math.sin(t * seed * 1.73 + seed) * 0.45;
}

interface ActorSlot {
  y: number;
  z: number;
  type: 0 | 1 | 2;
  prop: { c: number; r: number; kind: PropKind } | null;
  tower: Tower | null;
  creep: Creep | null;
}

const actorSlots: ActorSlot[] = [];
const actorOrder: number[] = [];
let actorCount = 0;

function actor(y: number, z: number, type: 0 | 1 | 2) {
  let slot = actorSlots[actorCount];
  if (!slot) {
    slot = { y: 0, z: 0, type: 0, prop: null, tower: null, creep: null };
    actorSlots[actorCount] = slot;
  }
  slot.y = y;
  slot.z = z;
  slot.type = type;
  slot.prop = null;
  slot.tower = null;
  slot.creep = null;
  actorCount += 1;
  return slot;
}

let backdropCache: { key: string; canvas: HTMLCanvasElement } | null = null;
let overlayCache: { key: string; canvas: HTMLCanvasElement } | null = null;
let lampGlowCache: HTMLCanvasElement | null = null;

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(w));
  canvas.height = Math.max(1, Math.floor(h));
  return canvas;
}

function ctx2d(canvas: HTMLCanvasElement) {
  const c = canvas.getContext("2d");
  if (!c) throw new Error("2d context unavailable");
  return c;
}

function currentDpr(ctx: CanvasRenderingContext2D) {
  const t = ctx.getTransform();
  return t.a > 0 ? t.a : 1;
}

function lampGlow() {
  if (lampGlowCache) return lampGlowCache;
  const size = 128;
  const canvas = makeCanvas(size, size);
  const c = ctx2d(canvas);
  const g = c.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(224,120,56,0.24)");
  g.addColorStop(1, "rgba(224,120,56,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, size, size);
  lampGlowCache = canvas;
  return canvas;
}

export function drawWorld(ctx: CanvasRenderingContext2D, engine: EmberEngine, cell: number, w: number, h: number) {
  const dpr = currentDpr(ctx);
  ctx.save();
  const shake = engine.reducedMotion ? 0 : engine.trauma * engine.trauma;
  if (shake > 0.002) {
    ctx.translate(nsin(engine.time * 28, 2.1) * 9 * shake, nsin(engine.time * 31, 3.4) * 8 * shake);
    ctx.rotate(nsin(engine.time * 22, 1.7) * 0.012 * shake);
  }

  const pad = 32;
  const backdropKey = `${engine.map.id}|${cell}|${Math.round(w)}|${Math.round(h)}|${dpr}|${engine.phase}`;
  if (!backdropCache || backdropCache.key !== backdropKey) {
    const canvas = makeCanvas((w + pad * 2) * dpr, (h + pad * 2) * dpr);
    const b = ctx2d(canvas);
    b.setTransform(dpr, 0, 0, dpr, pad * dpr, pad * dpr);
    b.fillStyle = engine.map.theme.ink;
    b.fillRect(-pad, -pad, w + pad * 2, h + pad * 2);
    drawGroundBase(b, cell, engine);
    drawPathBase(b, cell, engine);
    drawWaterBase(b, cell, engine);
    drawRuleBase(b, cell, engine);
    backdropCache = { key: backdropKey, canvas };
  }
  ctx.drawImage(backdropCache.canvas, -pad, -pad, w + pad * 2, h + pad * 2);
  drawGroundTufts(ctx, cell, engine.time, engine);
  drawPathMarquee(ctx, cell, engine);
  drawWaterShimmer(ctx, cell, engine.time, engine);
  drawAmbient(ctx, cell, engine);
  drawFieldRule(ctx, cell, engine);

  const spawn = engine.path[0];
  const base = engine.path[engine.path.length - 1];
  drawPortal(ctx, (spawn.c + 0.5) * cell, (spawn.r + 0.5) * cell, cell, engine.time, engine.phase === "wave");
  if (engine.phase === "ready" && (engine.wavePlan(engine.wave) ?? []).some((entry) => entry.kind === "lord")) {
    const gx = (spawn.c + 0.5) * cell;
    const gy = (spawn.r + 0.5) * cell;
    const r = cell * (0.78 + Math.sin(engine.time * 2.6) * 0.12);
    ctx.save();
    ctx.strokeStyle = "rgba(224,120,56,0.6)";
    ctx.lineWidth = Math.max(1.5, cell * 0.03);
    ctx.beginPath();
    ctx.arc(gx, gy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.42;
    ctx.beginPath();
    ctx.arc(gx, gy, r * 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  drawKeep(ctx, (base.c + 0.5) * cell, (base.r + 0.5) * cell, cell, engine.time, engine.lives);
  drawRouteTags(ctx, cell, engine);
  const glow = lampGlow();
  for (const prop of engine.props) {
    if (prop.kind !== "lamp") continue;
    const lx = (prop.c + 0.5) * cell;
    const ly = (prop.r + 0.45) * cell;
    const r = cell * 1.35;
    ctx.drawImage(glow, lx - r, ly - r, r * 2, r * 2);
  }
  drawLines(ctx, engine, cell);
  drawHover(ctx, engine, cell);

  actorCount = 0;
  for (const prop of engine.props) actor(prop.r + 0.55, -1, 0).prop = prop;
  for (const t of engine.towers) actor(t.r + 0.5, 0, 1).tower = t;
  for (const c of engine.creeps) actor(c.y, 1, 2).creep = c;
  actorOrder.length = actorCount;
  for (let i = 0; i < actorCount; i++) actorOrder[i] = i;
  actorOrder.sort((a, b) => actorSlots[a].y - actorSlots[b].y || actorSlots[a].z - actorSlots[b].z);
  for (let i = 0; i < actorCount; i++) {
    const slot = actorSlots[actorOrder[i]];
    if (slot.type === 0 && slot.prop) drawProp(ctx, slot.prop.c, slot.prop.r, slot.prop.kind, cell, engine.time);
    else if (slot.type === 1 && slot.tower) drawTower(ctx, slot.tower, cell, slot.tower.id === engine.selectedId, engine.time, !engine.reducedMotion);
    else if (slot.creep) drawCreep(ctx, slot.creep, cell, engine.path.length, slot.creep.id === engine.markedId, engine.time);
  }

  for (const burn of engine.burns) {
    const strength = Math.max(0.1, burn.life / 2.4);
    ctx.save();
    ctx.globalAlpha = strength * 0.24;
    ctx.fillStyle = EMBER;
    ctx.beginPath();
    ctx.ellipse(burn.x * cell, burn.y * cell, burn.r * cell * 0.85, burn.r * cell * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = strength * 0.45;
    ctx.strokeStyle = "rgba(58,32,18,0.9)";
    ctx.lineWidth = Math.max(1, cell * 0.03);
    ctx.beginPath();
    ctx.ellipse(burn.x * cell, burn.y * cell, burn.r * cell * 0.95, burn.r * cell * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (!engine.reducedMotion) {
      const glow = 0.35 + Math.sin(engine.time * 9 + burn.x * 3) * 0.18;
      ctx.globalAlpha = strength * glow;
      ctx.fillStyle = "#ffd9a0";
      ctx.beginPath();
      ctx.arc(burn.x * cell + Math.sin(engine.time * 6 + burn.y) * cell * 0.08, burn.y * cell, cell * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  for (const s of engine.shots) drawShot(ctx, s, cell, !engine.reducedMotion);
  for (const b of engine.beams) {
    ctx.save();
    const a = Math.max(0, b.life / b.max);
    ctx.globalAlpha = a;
    const x1 = b.x1 * cell;
    const y1 = b.y1 * cell;
    const x2 = b.x2 * cell;
    const y2 = b.y2 * cell;
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const nx = -dy * 0.08;
    const ny = dx * 0.08;
    ctx.lineTo(x1 + dx * 0.33 + nx, y1 + dy * 0.33 + ny);
    ctx.lineTo(x1 + dx * 0.66 - nx, y1 + dy * 0.66 - ny);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.globalAlpha = a * 0.45;
    ctx.lineWidth = 8;
    ctx.stroke();
    if (!engine.reducedMotion) {
      ctx.globalAlpha = a * 0.7;
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "#fff8e0";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = a;
      ctx.fillStyle = "#fff3c8";
      ctx.beginPath();
      ctx.arc(x2, y2, cell * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  drawParticles(ctx, engine, cell);
  drawFloaters(ctx, engine, cell);
  drawBanner(ctx, engine, w, cell);
  if (engine.streak >= 4 && engine.phase === "wave") {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = EMBER;
    ctx.font = `700 ${Math.max(11, cell * 0.2)}px Figtree, sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText(`Streak ${engine.streak}`, COLS * cell - 10, cell * 0.38);
    ctx.restore();
  }

  const night = engine.phase === "wave" && engine.wave % 4 === 0;
  const lastStand = engine.lives <= 5;
  const overlayKey = `${w}|${h}|${dpr}|${cell}|${night ? 1 : 0}|${lastStand ? 1 : 0}|${engine.map.id}`;
  if (!overlayCache || overlayCache.key !== overlayKey) {
    const canvas = makeCanvas(w * dpr, h * dpr);
    const o = ctx2d(canvas);
    o.setTransform(dpr, 0, 0, dpr, 0, 0);
    const vg = o.createRadialGradient(w * 0.5, h * 0.45, cell * 2, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(
      1,
      lastStand
        ? "rgba(48,12,10,0.62)"
        : night
          ? "rgba(8,10,16,0.58)"
          : engine.map.id === "keep-stair"
            ? "rgba(22,14,12,0.55)"
            : "rgba(18,22,15,0.42)",
    );
    o.fillStyle = vg;
    o.fillRect(0, 0, w, h);
    if (night) {
      o.fillStyle = "rgba(24, 28, 48, 0.12)";
      o.fillRect(0, 0, w, h);
    }
    o.strokeStyle = "rgba(58,68,50,0.9)";
    o.lineWidth = 2;
    o.strokeRect(1, 1, COLS * cell - 2, ROWS * cell - 2);
    overlayCache = { key: overlayKey, canvas };
  }
  ctx.drawImage(overlayCache.canvas, 0, 0, w, h);
  if (engine.hitstop > 0 && !engine.reducedMotion) {
    ctx.fillStyle = `rgba(255, 238, 196, ${Math.min(0.1, engine.hitstop * 1.6)})`;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

function nearPath(c: number, r: number, engine: EmberEngine) {
  return (
    engine.pathSet.has(`${c + 1},${r}`) ||
    engine.pathSet.has(`${c - 1},${r}`) ||
    engine.pathSet.has(`${c},${r + 1}`) ||
    engine.pathSet.has(`${c},${r - 1}`)
  );
}

function drawGroundBase(ctx: CanvasRenderingContext2D, cell: number, engine: EmberEngine) {
  ctx.fillStyle = engine.map.theme.moss;
  ctx.fillRect(0, 0, COLS * cell, ROWS * cell);
  const grass = spr("grass");
  if (grass) {
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.drawImage(grass, 0, 0, COLS * cell, ROWS * cell);
    ctx.restore();
  }
  ctx.fillStyle = engine.map.theme.bank;
  ctx.globalAlpha = 0.32;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (engine.pathSet.has(`${c},${r}`)) continue;
      if (nearPath(c, r, engine)) ctx.fillRect(c * cell, r * cell, cell + 0.6, cell + 0.6);
    }
  }
  ctx.globalAlpha = 1;
}

function drawGroundTufts(ctx: CanvasRenderingContext2D, cell: number, time: number, engine: EmberEngine) {
  ctx.save();
  ctx.strokeStyle = "rgba(90,122,72,0.35)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  let drew = false;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (engine.pathSet.has(`${c},${r}`)) continue;
      const seed = (c * 17 + r * 31) % 7;
      if (engine.blockedSet.has(`${c},${r}`) || (seed !== 0 && seed !== 3)) continue;
      const gx = c * cell + cell * 0.35;
      const gy = r * cell + cell * 0.62;
      const sway = Math.sin(time * 1.6 + c) * 1.4;
      ctx.moveTo(gx, gy);
      ctx.quadraticCurveTo(gx + sway, gy - cell * 0.2, gx + 3 + sway, gy - cell * 0.28);
      drew = true;
    }
  }
  if (drew) ctx.stroke();
  ctx.restore();
}

function drawWaterBase(ctx: CanvasRenderingContext2D, cell: number, engine: EmberEngine) {
  const wet = engine.waterSet;
  for (const [c, r] of engine.map.water) {
    const x = (c + 0.5) * cell;
    const y = (r + 0.5) * cell;
    ctx.beginPath();
    ctx.ellipse(x, y, cell * 0.52, cell * 0.38, 0, 0, Math.PI * 2);
    ctx.fillStyle = engine.map.theme.water;
    ctx.fill();
    if (wet.has(`${c + 1},${r}`)) {
      ctx.fillRect(x, y - cell * 0.28, cell * 0.5, cell * 0.56);
    }
    if (wet.has(`${c},${r + 1}`)) {
      ctx.fillRect(x - cell * 0.36, y, cell * 0.72, cell * 0.5);
    }
  }
}

function drawWaterShimmer(ctx: CanvasRenderingContext2D, cell: number, time: number, engine: EmberEngine) {
  if (engine.reducedMotion) return;
  ctx.save();
  ctx.fillStyle = engine.map.theme.waterLit;
  for (const [c, r] of engine.map.water) {
    const x = (c + 0.5) * cell;
    const y = (r + 0.5) * cell;
    ctx.globalAlpha = 0.32 + Math.sin(time * 2 + c) * 0.1;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, cell * 0.26, cell * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawAmbient(ctx: CanvasRenderingContext2D, cell: number, engine: EmberEngine) {
  const width = COLS * cell;
  const height = ROWS * cell;
  const time = engine.reducedMotion ? 0 : engine.time;
  const ambient = engine.map.profile.ambient;
  ctx.save();
  ctx.globalCompositeOperation = "screen";

  if (ambient === "lanterns") {
    for (let i = 0; i < 7; i++) {
      const x = ((i * 71 + 34) % Math.max(1, width - 12)) + 6;
      const y = ((i * 43 + 28) % Math.max(1, height - 16)) + 8;
      const pulse = 0.3 + (Math.sin(time * 2.2 + i * 1.7) + 1) * 0.12;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = COPPER;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.4, cell * 0.035), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (ambient === "pine-fog") {
    const fog = ctx.createLinearGradient(0, height * 0.25, width, height * 0.7);
    fog.addColorStop(0, "rgba(126,166,157,0)");
    fog.addColorStop(0.45, "rgba(126,166,157,0.12)");
    fog.addColorStop(1, "rgba(126,166,157,0)");
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = fog;
    ctx.fillRect(-width * 0.1 + Math.sin(time * 0.25) * cell, height * 0.2, width * 1.2, height * 0.42);
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#b5c8b4";
    for (let i = 0; i < 5; i++) {
      const y = height * (0.18 + i * 0.17) + Math.sin(time * 0.35 + i) * cell * 0.14;
      ctx.fillRect(-cell, y, width + cell * 2, Math.max(1, cell * 0.03));
    }
  } else if (ambient === "keep-ash") {
    ctx.fillStyle = "#d6c6a5";
    for (let i = 0; i < 14; i++) {
      const x = ((i * 53 + 19) % Math.max(1, width - 4)) + 2;
      const y = ((i * 37 + 11 + time * (7 + (i % 3) * 3)) % Math.max(1, height - 4)) + 2;
      ctx.globalAlpha = 0.1 + (i % 4) * 0.025;
      ctx.fillRect(x, y, Math.max(1, cell * 0.025), Math.max(1, cell * 0.025));
    }
  } else if (ambient === "river-rain") {
    ctx.strokeStyle = "#82b5ad";
    ctx.lineWidth = Math.max(1, cell * 0.018);
    for (let i = 0; i < 18; i++) {
      const x = ((i * 47 + time * (18 + (i % 4) * 5)) % (width + cell * 2)) - cell;
      const y = (i * 29) % Math.max(1, height - cell);
      ctx.globalAlpha = 0.08 + (i % 3) * 0.02;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - cell * 0.12, y + cell * 0.42);
      ctx.stroke();
    }
  } else if (ambient === "emberfall") {
    const glow = ctx.createRadialGradient(width * 0.55, height * 0.48, 0, width * 0.55, height * 0.48, Math.max(width, height) * 0.66);
    glow.addColorStop(0, "rgba(224,120,56,0.12)");
    glow.addColorStop(1, "rgba(224,120,56,0)");
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = EMBER;
    for (let i = 0; i < 16; i++) {
      const x = ((i * 61 + 17) % Math.max(1, width - 6)) + 3;
      const y = ((i * 31 + 9 - time * (5 + (i % 4) * 2)) % Math.max(1, height - 6)) + 3;
      ctx.globalAlpha = 0.12 + (i % 3) * 0.04;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1, cell * 0.025 + (i % 2) * cell * 0.018), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (ambient === "glass-tide") {
    ctx.strokeStyle = "#9be6db";
    ctx.lineWidth = Math.max(1, cell * 0.018);
    for (let i = 0; i < 10; i++) {
      const x = ((i * 67 + 18) % Math.max(1, width - 8)) + 4;
      const y = ((i * 41 + 22 + Math.sin(time * 0.8 + i) * cell * 0.12) % Math.max(1, height - 10)) + 5;
      ctx.globalAlpha = 0.08 + (i % 3) * 0.025;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + cell * 0.22, y - cell * 0.08, x + cell * 0.44, y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawRuleBase(ctx: CanvasRenderingContext2D, cell: number, engine: EmberEngine) {
  const rule = engine.map.profile.rule.id;
  if (rule === "lantern-aura") {
    ctx.save();
    ctx.setLineDash([cell * 0.12, cell * 0.1]);
    ctx.lineWidth = Math.max(1, cell * 0.018);
    ctx.strokeStyle = "rgba(224,120,56,0.24)";
    for (const prop of engine.props) {
      if (prop.kind !== "lamp") continue;
      ctx.beginPath();
      ctx.arc((prop.c + 0.5) * cell, (prop.r + 0.5) * cell, cell * 2.02, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  } else if (rule === "stone-latch" && (engine.phase === "ready" || engine.phase === "wave")) {
    ctx.save();
    ctx.fillStyle = "rgba(212,160,84,0.055)";
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (engine.pathSet.has(`${c},${r}`) || engine.blockedSet.has(`${c},${r}`)) continue;
        if (!nearPath(c, r, engine)) continue;
        ctx.fillRect(c * cell + 2, r * cell + 2, cell - 4, cell - 4);
      }
    }
    ctx.restore();
  }
}

function drawFieldRule(ctx: CanvasRenderingContext2D, cell: number, engine: EmberEngine) {
  const rule = engine.map.profile.rule.id;
  ctx.save();
  if (rule === "emberfall") {
    for (const tower of engine.towers) {
      if (towerForm(tower.dmgLvl, tower.rateLvl, tower.rangeLvl) < 4) continue;
      const glow = ctx.createRadialGradient(
        (tower.c + 0.5) * cell,
        (tower.r + 0.5) * cell,
        cell * 0.12,
        (tower.c + 0.5) * cell,
        (tower.r + 0.5) * cell,
        cell * 0.8,
      );
      glow.addColorStop(0, "rgba(224,120,56,0.2)");
      glow.addColorStop(1, "rgba(224,120,56,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc((tower.c + 0.5) * cell, (tower.r + 0.5) * cell, cell * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (rule === "glass-tide" && (engine.phase === "ready" || engine.phase === "wave")) {
    const pulse = 0.07 + Math.sin(engine.time * 2.8) * 0.025;
    ctx.fillStyle = `rgba(155,230,219,${pulse})`;
    ctx.strokeStyle = "rgba(155,230,219,0.32)";
    ctx.lineWidth = Math.max(1, cell * 0.016);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!engine.canBuild(c, r) || !engine.besideWater({ c, r })) continue;
        ctx.fillRect(c * cell + 2, r * cell + 2, cell - 4, cell - 4);
        ctx.strokeRect(c * cell + 3, r * cell + 3, cell - 6, cell - 6);
      }
    }
    for (const tower of engine.towers) {
      if (!engine.besideWater(tower)) continue;
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = "#9be6db";
      ctx.beginPath();
      ctx.arc((tower.c + 0.5) * cell, (tower.r + 0.5) * cell, cell * 0.72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

function strokeRoute(ctx: CanvasRenderingContext2D, engine: EmberEngine, cell: number) {
  const path = engine.path;
  if (path.length < 2) return;
  ctx.beginPath();
  const pts = path.map((p) => ({ x: (p.c + 0.5) * cell, y: (p.r + 0.5) * cell }));
  ctx.moveTo(pts[0].x, pts[0].y);
  const rad = cell * 0.42;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const cur = pts[i];
    const next = pts[i + 1];
    const inDx = cur.x - prev.x;
    const inDy = cur.y - prev.y;
    const outDx = next.x - cur.x;
    const outDy = next.y - cur.y;
    const inLen = Math.hypot(inDx, inDy) || 1;
    const outLen = Math.hypot(outDx, outDy) || 1;
    const r = Math.min(rad, inLen * 0.45, outLen * 0.45);
    ctx.lineTo(cur.x - (inDx / inLen) * r, cur.y - (inDy / inLen) * r);
    ctx.quadraticCurveTo(cur.x, cur.y, cur.x + (outDx / outLen) * r, cur.y + (outDy / outLen) * r);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last.x, last.y);
}

function drawPathBase(ctx: CanvasRenderingContext2D, cell: number, engine: EmberEngine) {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = PATH_EDGE;
  ctx.lineWidth = cell * 0.94;
  strokeRoute(ctx, engine, cell);
  ctx.stroke();
  const tile = spr("path");
  if (tile) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (const key of engine.pathSet) {
      const [cs, rs] = key.split(",");
      ctx.drawImage(tile, Number(cs) * cell, Number(rs) * cell, cell, cell);
    }
    ctx.restore();
  }
  ctx.strokeStyle = engine.map.theme.pathLit;
  ctx.lineWidth = cell * 0.62;
  strokeRoute(ctx, engine, cell);
  ctx.stroke();
  ctx.strokeStyle = engine.map.theme.pathLit;
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = cell * 0.22;
  strokeRoute(ctx, engine, cell);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawPathMarquee(ctx: CanvasRenderingContext2D, cell: number, engine: EmberEngine) {
  if (engine.reducedMotion) return;
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = engine.wave % 4 === 0 && engine.phase === "wave" ? "rgba(224,120,56,0.45)" : "rgba(212,160,84,0.3)";
  ctx.lineWidth = Math.max(1.4, cell * 0.04);
  ctx.setLineDash([cell * 0.26, cell * 0.2]);
  ctx.lineDashOffset = -engine.time * 22;
  strokeRoute(ctx, engine, cell);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawLines(ctx: CanvasRenderingContext2D, engine: EmberEngine, cell: number) {
  if (engine.towers.length < 2) return;
  ctx.save();
  for (let i = 0; i < engine.towers.length; i++) {
    const a = engine.towers[i];
    for (let j = i + 1; j < engine.towers.length; j++) {
      const b = engine.towers[j];
      if (Math.abs(a.c - b.c) + Math.abs(a.r - b.r) !== 1) continue;
      const bond = engine.bondBetween(a, b);
      const bondColor =
        bond?.id === "windcut"
          ? FROST
          : bond?.id === "ashring"
            ? EMBER
            : bond?.id === "stormroot"
              ? COPPER
              : bond?.id === "brand"
                ? EMBER
                : "rgba(212,160,84,0.35)";
      ctx.strokeStyle = bond ? bondColor : "rgba(212,160,84,0.35)";
      ctx.globalAlpha = bond ? 0.82 : 1;
      ctx.lineWidth = bond ? Math.max(2.2, cell * 0.05) : Math.max(1.4, cell * 0.028);
      ctx.setLineDash(bond ? [cell * 0.15, cell * 0.07] : [5, 6]);
      ctx.lineDashOffset = bond ? -engine.time * 18 : 0;
      ctx.beginPath();
      ctx.moveTo((a.c + 0.5) * cell, (a.r + 0.5) * cell);
      ctx.lineTo((b.c + 0.5) * cell, (b.r + 0.5) * cell);
      ctx.stroke();
      if (bond) {
        ctx.setLineDash([]);
        ctx.fillStyle = bondColor;
        ctx.globalAlpha = 0.72 + Math.sin(engine.time * 5 + a.id + b.id) * 0.12;
        ctx.beginPath();
        ctx.arc(((a.c + b.c + 1) / 2) * cell, ((a.r + b.r + 1) / 2) * cell, Math.max(2.5, cell * 0.07), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.setLineDash([]);
  ctx.restore();
  for (const t of engine.towers) {
    if (t.kind !== "ward") continue;
    const range =
      rangeAt(t.kind, t.rangeLvl) *
      (engine.relics.has("glass") ? 1.12 : 1) *
      (t.empowered ? 1.18 : 1) *
      engine.fieldRangeMultiplier(t);
    ctx.save();
    ctx.globalAlpha = 0.1 + Math.sin(engine.time * 3 + t.id) * 0.04;
    ctx.fillStyle = COPPER;
    ctx.beginPath();
    ctx.arc((t.c + 0.5) * cell, (t.r + 0.5) * cell, range * cell, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawProp(ctx: CanvasRenderingContext2D, c: number, r: number, kind: PropKind, cell: number, time: number) {
  const x = (c + 0.5) * cell;
  const y = (r + 0.72) * cell;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(18,22,15,0.32)";
  ctx.beginPath();
  ctx.ellipse(0, cell * 0.08, cell * 0.22, cell * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  if ((kind === "pine" || kind === "oak") && drawSprite(ctx, "pine", 0, cell * 0.1, cell * 1.02)) {
    ctx.restore();
    return;
  }
  if ((kind === "rock" || kind === "stump") && drawSprite(ctx, "rock", 0, cell * 0.08, cell * 0.62)) {
    ctx.restore();
    return;
  }
  if (kind === "lamp") {
    ctx.fillStyle = STONE;
    ctx.fillRect(-2, -cell * 0.28, 4, cell * 0.34);
    ctx.fillStyle = COPPER;
    ctx.beginPath();
    ctx.arc(0, -cell * 0.32, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.35 + Math.sin(time * 3 + c) * 0.1;
    ctx.fillStyle = EMBER;
    ctx.beginPath();
    ctx.arc(0, -cell * 0.32, 10, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "cart") {
    ctx.fillStyle = "#5a3a22";
    ctx.fillRect(-cell * 0.2, -cell * 0.08, cell * 0.4, cell * 0.16);
  } else if (kind === "reed" || kind === "shroom" || kind === "fence") {
    ctx.strokeStyle = "#4a6a3a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.quadraticCurveTo(4, -cell * 0.12, 1, -cell * 0.22);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPortal(ctx: CanvasRenderingContext2D, x: number, y: number, cell: number, time: number, open: boolean) {
  if (drawSprite(ctx, "gate", x, y + cell * 0.12, cell * 1.05, { alpha: open ? 1 : 0.92 })) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = STONE;
  ctx.fillRect(-cell * 0.22, -cell * 0.28, cell * 0.12, cell * 0.4);
  ctx.fillRect(cell * 0.1, -cell * 0.28, cell * 0.12, cell * 0.4);
  ctx.fillStyle = open ? EMBER : COPPER;
  ctx.globalAlpha = 0.35 + Math.sin(time * 3) * 0.1;
  ctx.fillRect(-cell * 0.08, -cell * 0.2, cell * 0.16, cell * 0.28);
  ctx.restore();
}

function drawKeep(ctx: CanvasRenderingContext2D, x: number, y: number, cell: number, time: number, lives: number) {
  const glow = ctx.createRadialGradient(x, y, 4, x, y, cell * 1.2);
  glow.addColorStop(0, lives <= 6 ? "rgba(196,92,74,0.28)" : "rgba(212,160,84,0.2)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, cell * 1.2, 0, Math.PI * 2);
  ctx.fill();
  if (drawSprite(ctx, "keep", x, y + cell * 0.16, cell * 1.12)) {
    ctx.fillStyle = lives <= 6 ? BLOOD : PARCHMENT;
    ctx.font = `700 ${Math.max(9, cell * 0.2)}px Figtree, sans-serif`;
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(18,22,15,0.9)";
    ctx.shadowBlur = 5;
    ctx.fillText(String(lives), x, y + cell * 0.38);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = STONE;
  ctx.fillRect(-cell * 0.28, -cell * 0.22, cell * 0.56, cell * 0.4);
  ctx.fillStyle = STONE_LIT;
  ctx.fillRect(-cell * 0.2, -cell * 0.38, cell * 0.4, cell * 0.16);
  ctx.fillStyle = lives <= 6 ? BLOOD : PARCHMENT;
  ctx.font = `700 ${Math.max(9, cell * 0.2)}px Figtree, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(String(lives), 0, cell * 0.18);
  ctx.restore();
}

function drawRouteTags(ctx: CanvasRenderingContext2D, cell: number, engine: EmberEngine) {
  if (engine.phase !== "ready" && engine.phase !== "wave") return;
  const spawn = engine.path[0];
  const base = engine.path[engine.path.length - 1];
  const size = Math.max(8, cell * 0.13);
  const tagY = (r: number) => Math.max(cell * 0.22, (r + 0.5) * cell - cell * 0.54);
  ctx.save();
  ctx.font = `700 ${size}px Figtree, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(18,22,15,0.9)";
  ctx.shadowBlur = 4;

  ctx.fillStyle = "rgba(232,220,196,0.76)";
  ctx.textAlign = "left";
  ctx.fillText("ENTRY", Math.max(4, (spawn.c + 0.12) * cell), tagY(spawn.r));

  ctx.fillStyle = engine.lives <= 6 ? "rgba(196,92,74,0.9)" : "rgba(212,160,84,0.9)";
  ctx.textAlign = "right";
  ctx.fillText("KEEP", Math.min(COLS * cell - 4, (base.c + 0.88) * cell), tagY(base.r));
  ctx.restore();
}

function drawHover(ctx: CanvasRenderingContext2D, engine: EmberEngine, cell: number) {
  const selected = engine.selectedTower();
  if (selected) {
    const range = engine.sightRange(selected);
    ctx.beginPath();
    ctx.arc((selected.c + 0.5) * cell, (selected.r + 0.5) * cell, range * cell, 0, Math.PI * 2);
    const ink =
      selected.kind === "frost"
        ? "106,168,180"
        : selected.kind === "mortar" || selected.kind === "cinder"
          ? "224,120,56"
          : selected.kind === "pike"
            ? "176,120,72"
            : "212,160,84";
    ctx.fillStyle = `rgba(${ink},0.08)`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${ink},0.55)`;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  if (engine.movingId != null && (engine.phase === "ready" || engine.phase === "wave")) {
    const glow = 0.1 + Math.sin(engine.time * 4) * 0.05;
    ctx.fillStyle = `rgba(106,168,180,${glow})`;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!engine.canBuild(c, r)) continue;
        ctx.fillRect(c * cell + 2, r * cell + 2, cell - 4, cell - 4);
      }
    }
  }
  if (engine.selectedKind && (engine.phase === "ready" || engine.phase === "wave")) {
    const glow = 0.07 + Math.sin(engine.time * 3.2) * 0.04;
    ctx.fillStyle = `rgba(212,160,84,${glow})`;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!engine.canBuild(c, r) || !nearPath(c, r, engine)) continue;
        ctx.fillRect(c * cell + 2, r * cell + 2, cell - 4, cell - 4);
      }
    }
  }
  if (engine.hoverC < 0 || engine.phase === "title") return;
  const ok = engine.canBuild(engine.hoverC, engine.hoverR);
  ctx.fillStyle = ok ? "rgba(212,160,84,0.22)" : "rgba(196,92,74,0.2)";
  ctx.fillRect(engine.hoverC * cell, engine.hoverR * cell, cell, cell);
  if (ok && engine.selectedKind) {
    const range = engine.placementRange(engine.selectedKind);
    ctx.strokeStyle = "rgba(232,220,196,0.35)";
    ctx.beginPath();
    ctx.arc((engine.hoverC + 0.5) * cell, (engine.hoverR + 0.5) * cell, range * cell, 0, Math.PI * 2);
    ctx.stroke();
    const ghost = 0.42 + Math.sin(engine.time * 4) * 0.12;
    drawSprite(ctx, engine.selectedKind, (engine.hoverC + 0.5) * cell, (engine.hoverR + 0.5) * cell + cell * 0.12, cell * 0.82, {
      alpha: ghost,
    });
  }
}

function easeOutBack(t: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

function kindInk(kind: Tower["kind"]) {
  if (kind === "frost") return FROST;
  if (kind === "spark") return COPPER;
  if (kind === "mortar" || kind === "cinder") return EMBER;
  if (kind === "pike") return "#b07848";
  if (kind === "ward") return "#c4a060";
  if (kind === "bramble") return "#4a6a32";
  return "#6d8a4a";
}

function formInk(tower: Tower, form: number) {
  if (tower.empowered) return EMBER;
  if (form >= 4) return EMBER;
  if (form >= 3) return COPPER;
  if (form >= 2) return PARCHMENT;
  return kindInk(tower.kind);
}

function drawFormAura(ctx: CanvasRenderingContext2D, tower: Tower, cell: number, form: number, time: number) {
  if (form < 2 && !tower.empowered) return;
  const color = formInk(tower, form);
  const radius = cell * (0.34 + form * 0.035 + (tower.empowered ? 0.04 : 0));
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = form >= 4 || tower.empowered ? 2.2 : form >= 3 ? 1.8 : 1.35;
  ctx.globalAlpha = form >= 4 || tower.empowered ? 0.68 : form >= 3 ? 0.55 : 0.36;
  ctx.setLineDash(
    tower.empowered
      ? [cell * 0.06, cell * 0.04]
      : form >= 4
        ? [cell * 0.12, cell * 0.045]
        : form >= 3
          ? [cell * 0.16, cell * 0.06]
          : [cell * 0.08, cell * 0.1],
  );
  ctx.lineDashOffset = -time * cell * (tower.empowered ? 0.28 : 0.16);
  ctx.beginPath();
  ctx.arc(0, -cell * 0.08, radius, -Math.PI * 0.88, Math.PI * 0.88);
  ctx.stroke();
  ctx.setLineDash([]);

  if (form >= 3) {
    const nodes = form >= 4 || tower.empowered ? 4 : 3;
    for (let i = 0; i < nodes; i++) {
      const a = -Math.PI * 0.72 + (i / Math.max(1, nodes - 1)) * Math.PI * 1.44;
      const x = Math.cos(a) * radius;
      const y = -cell * 0.08 + Math.sin(a) * radius * 0.78;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, cell * (tower.empowered ? 0.035 : 0.026), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawUpgradeForge(ctx: CanvasRenderingContext2D, tower: Tower, cell: number, time: number) {
  const branch = tower.upgradeBranch;
  if (!branch || tower.upgradeT <= 0) return;
  const duration = branch === "emberlit" ? 1.45 : 1.15;
  const remaining = Math.min(1, tower.upgradeT / duration);
  const progress = 1 - remaining;
  const fade = Math.min(1, tower.upgradeT / 0.18) * (0.62 + remaining * 0.38);
  const color = branch === "rate" ? COPPER : EMBER;
  const radius = cell * (0.48 + progress * 0.45);
  const spokes = branch === "emberlit" ? 5 : branch === "rate" ? 4 : 3;

  ctx.save();
  ctx.globalAlpha = 0.94 * fade;
  ctx.strokeStyle = color;
  ctx.lineWidth = branch === "emberlit" ? 3 : 2.2;
  ctx.setLineDash(branch === "rate" ? [cell * 0.045, cell * 0.1] : [cell * 0.12, cell * 0.05]);
  ctx.lineDashOffset = branch === "rate" ? time * cell * 0.46 : -time * cell * 0.36;
  ctx.beginPath();
  ctx.arc(0, -cell * 0.06, radius, -Math.PI * 0.9, Math.PI * 0.9);
  ctx.stroke();
  ctx.setLineDash([]);

  for (let i = 0; i < spokes; i++) {
    const a = time * (branch === "rate" ? 1.5 : 0.8) + (i / spokes) * Math.PI * 2;
    const inner = radius * 0.82;
    const outer = radius + cell * (0.1 + progress * 0.1);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner, -cell * 0.06 + Math.sin(a) * inner);
    ctx.lineTo(Math.cos(a) * outer, -cell * 0.06 + Math.sin(a) * outer);
    ctx.stroke();
  }

  if (branch === "emberlit") {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -cell * 0.52 - progress * cell * 0.08);
    ctx.lineTo(cell * 0.07, -cell * 0.39 - progress * cell * 0.08);
    ctx.lineTo(0, -cell * 0.32 - progress * cell * 0.08);
    ctx.lineTo(-cell * 0.07, -cell * 0.39 - progress * cell * 0.08);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawFormKit(ctx: CanvasRenderingContext2D, tower: Tower, cell: number, form: number, time: number) {
  const ink = kindInk(tower.kind);
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = 1.6;
  if (tower.kind === "bow" && form >= 2) {
    ctx.beginPath();
    ctx.moveTo(-cell * 0.22, -cell * 0.02);
    ctx.quadraticCurveTo(0, -cell * (0.18 + form * 0.04), cell * 0.22, -cell * 0.02);
    ctx.stroke();
  }
  if (tower.kind === "mortar" && form >= 2) {
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(0, -cell * 0.18, cell * (0.08 + form * 0.02), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (tower.kind === "frost" && form >= 2) {
    for (let i = 0; i < form; i++) {
      const a = time * 0.6 + i * 1.2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * cell * 0.12, -cell * 0.1 + Math.sin(a) * cell * 0.08);
      ctx.lineTo(Math.cos(a) * cell * 0.28, -cell * 0.22 + Math.sin(a) * cell * 0.16);
      ctx.stroke();
    }
  }
  if (tower.kind === "spark" && form >= 2) {
    ctx.globalAlpha = 0.55 + Math.sin(time * 8 + tower.id) * 0.2;
    ctx.beginPath();
    ctx.moveTo(-cell * 0.16, -cell * 0.22);
    ctx.lineTo(0, -cell * 0.08);
    ctx.lineTo(cell * 0.1, -cell * 0.28);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (tower.kind === "bramble" && form >= 2) {
    for (let i = 0; i < form + 1; i++) {
      const a = -0.8 + i * 0.45;
      ctx.beginPath();
      ctx.moveTo(0, cell * 0.06);
      ctx.lineTo(Math.cos(a) * cell * 0.28, Math.sin(a) * cell * 0.2 - cell * 0.08);
      ctx.stroke();
    }
  }
  if (tower.kind === "ward" && form >= 2) {
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(0, 0, cell * (0.2 + form * 0.05), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (tower.kind === "pike" && form >= 2) {
    ctx.beginPath();
    ctx.moveTo(-cell * 0.04, cell * 0.04);
    ctx.lineTo(cell * (0.16 + form * 0.04), -cell * (0.22 + form * 0.03));
    ctx.stroke();
  }
  if (tower.kind === "cinder" && form >= 2) {
    ctx.globalAlpha = 0.55 + Math.sin(time * 6 + tower.id) * 0.2;
    ctx.beginPath();
    ctx.arc(0, -cell * 0.16, cell * (0.06 + form * 0.015), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (tower.empowered) {
    ctx.fillStyle = EMBER;
    ctx.beginPath();
    ctx.moveTo(0, -cell * 0.56);
    ctx.quadraticCurveTo(cell * 0.08, -cell * 0.4, 0, -cell * 0.28);
    ctx.quadraticCurveTo(-cell * 0.08, -cell * 0.4, 0, -cell * 0.56);
    ctx.fill();
  } else if (form >= 4) {
    ctx.fillStyle = COPPER;
    ctx.beginPath();
    ctx.moveTo(0, -cell * 0.5);
    ctx.lineTo(cell * 0.09, -cell * 0.34);
    ctx.lineTo(-cell * 0.09, -cell * 0.34);
    ctx.fill();
  }
}

function drawChargeAura(ctx: CanvasRenderingContext2D, tower: Tower, cell: number, time: number) {
  if (!tower.volt && !tower.siege && !tower.storm && !tower.brace) return;
  const color = tower.volt ? COPPER : tower.siege ? EMBER : tower.storm ? "#e8c56a" : "#b67848";
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.45 + Math.sin(time * 6 + tower.id) * 0.22;
  ctx.lineWidth = 2;
  ctx.setLineDash([cell * 0.1, cell * 0.08]);
  ctx.lineDashOffset = -time * 24;
  ctx.beginPath();
  ctx.arc(0, -cell * 0.05, cell * 0.42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawMuzzleFlash(ctx: CanvasRenderingContext2D, tower: Tower, cell: number, motion: boolean) {
  if (!motion || tower.recoil <= 0.32) return;
  const angle = tower.visAngle ?? tower.angle;
  const flash = Math.min(1, (tower.recoil - 0.32) / 0.68);
  const mx = Math.cos(angle) * cell * 0.42;
  const my = Math.sin(angle) * cell * 0.42 - cell * 0.06;
  const warm = tower.kind === "frost" ? "106,168,180" : tower.kind === "bramble" ? "122,154,88" : "240,160,70";
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(mx, my);
  ctx.rotate(angle);
  ctx.globalAlpha = flash * 0.9;
  ctx.fillStyle = `rgba(${warm},0.3)`;
  ctx.beginPath();
  ctx.arc(0, 0, cell * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,242,205,0.82)";
  ctx.beginPath();
  ctx.arc(0, 0, cell * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,244,210,0.85)";
  ctx.lineWidth = Math.max(1, cell * 0.03);
  ctx.beginPath();
  ctx.moveTo(cell * 0.04, 0);
  ctx.lineTo(cell * (0.2 + flash * 0.12), 0);
  ctx.stroke();
  ctx.restore();
}

function drawTower(ctx: CanvasRenderingContext2D, tower: Tower, cell: number, selected: boolean, time: number, motion = true) {
  const x = (tower.c + 0.5) * cell;
  const y = (tower.r + 0.5) * cell;
  const pop = easeOutBack(Math.min(1, tower.build));
  const form = towerForm(tower.dmgLvl, tower.rateLvl, tower.rangeLvl);
  const kick = tower.recoil * cell * 0.08;
  ctx.save();
  ctx.translate(x - Math.cos(tower.angle) * kick, y + Math.sin(time * 2.1 + tower.id) * 0.8 - Math.sin(tower.angle) * kick);
  ctx.scale(pop * (1 + form * 0.04), pop * (1 + form * 0.04));
  ctx.fillStyle = "rgba(18,22,15,0.38)";
  ctx.beginPath();
  ctx.ellipse(0, cell * 0.22, cell * (0.26 + form * 0.03), cell * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();
  if (selected) {
    ctx.strokeStyle = `rgba(232,220,196,${0.45 + Math.sin(time * 4) * 0.2})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-cell * 0.4, -cell * 0.48, cell * 0.8, cell * 0.8, 6);
    ctx.stroke();
  }
  drawFormAura(ctx, tower, cell, form, time);
  const size = cell * (0.82 + form * 0.08 + (tower.empowered ? 0.06 : 0));
  if (form >= 2) {
    ctx.strokeStyle = form >= 4 ? EMBER : form === 3 ? COPPER : "rgba(212,160,84,0.55)";
    ctx.lineWidth = form >= 3 ? 2.4 : 1.6;
    ctx.beginPath();
    ctx.ellipse(0, cell * 0.2, cell * (0.22 + form * 0.03), cell * 0.09, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (form >= 3 || tower.empowered) {
    ctx.globalAlpha = 0.28 + Math.sin(time * 5 + tower.id) * 0.08;
    ctx.fillStyle = tower.empowered ? EMBER : form >= 4 ? EMBER : COPPER;
    ctx.beginPath();
    ctx.arc(0, -cell * 0.08, cell * (tower.empowered ? 0.42 : 0.34), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  drawSprite(ctx, tower.kind, 0, cell * 0.12, size);
  drawChargeAura(ctx, tower, cell, time);
  drawMuzzleFlash(ctx, tower, cell, motion);
  drawFormKit(ctx, tower, cell, form, time);
  drawUpgradeForge(ctx, tower, cell, time);
  for (let i = 0; i < MAX_UPGRADE; i++) {
    ctx.fillStyle = i < tower.dmgLvl ? EMBER : "rgba(58,68,50,0.9)";
    ctx.fillRect(-cell * 0.18 + i * cell * 0.1, cell * 0.2, cell * 0.08, cell * 0.035);
    ctx.fillStyle = i < tower.rateLvl ? COPPER : "rgba(58,68,50,0.9)";
    ctx.fillRect(-cell * 0.18 + i * cell * 0.1, cell * 0.25, cell * 0.08, cell * 0.03);
    ctx.fillStyle = i < tower.rangeLvl ? FROST : "rgba(58,68,50,0.9)";
    ctx.fillRect(-cell * 0.18 + i * cell * 0.1, cell * 0.3, cell * 0.08, cell * 0.03);
  }
  if (selected) {
    ctx.fillStyle = PARCHMENT;
    ctx.font = `700 ${Math.max(8, cell * 0.16)}px Figtree, sans-serif`;
    ctx.textAlign = "center";
    const aim = tower.aim ?? "first";
    ctx.fillText(aim === "close" ? "NEAR" : aim === "strong" ? "TOUGH" : aim.toUpperCase(), 0, -cell * 0.5);
  }
  ctx.restore();
}

function drawCreep(ctx: CanvasRenderingContext2D, creep: Creep, cell: number, pathLen: number, marked = false, time = 0) {
  const px = creep.x * cell;
  const py = creep.y * cell;
  const fade = creep.alive ? 1 : Math.max(0, creep.death / 0.28);
  const size =
    (creep.kind === "lord"
      ? 0.4
      : creep.kind === "shell"
        ? 0.3
        : creep.kind === "ashfang"
          ? 0.27
          : creep.kind === "hound"
            ? 0.23
            : creep.kind === "shaman" || creep.kind === "knave"
              ? 0.24
              : creep.kind === "moth"
                ? 0.18
                : 0.2) *
    cell;
  const bob =
    creep.kind === "wisp" || creep.kind === "moth"
      ? Math.sin(creep.progress * 6) * 3
      : Math.sin(creep.progress * 10) * 1.2;
  const stretch = 1 + Math.sin(creep.progress * 10) * (creep.kind === "hound" || creep.kind === "ashfang" ? 0.08 : 0.03);
  const spawnPop = creep.alive ? 0.72 + Math.min(1, creep.spawn) * 0.28 : 1;
  const deathPop = creep.alive ? 1 : 1 + (1 - fade) * 0.4;
  ctx.save();
  ctx.translate(px, py + bob);
  ctx.rotate(creep.kind === "wisp" ? 0 : creep.facing);
  ctx.scale(creep.squash * spawnPop * deathPop, creep.squash * stretch * spawnPop * deathPop);
  ctx.globalAlpha = fade * (creep.alive ? Math.max(0.4, creep.spawn) : 1);
  if (creep.kind === "lord" && creep.alive) {
    ctx.globalAlpha = 0.22 * fade;
    ctx.fillStyle = EMBER;
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = fade;
    ctx.strokeStyle = "rgba(224,120,56,0.72)";
    ctx.lineWidth = Math.max(1.2, cell * 0.025);
    ctx.setLineDash([size * 0.5, size * 0.28]);
    ctx.lineDashOffset = creep.progress * -cell * 0.4;
    ctx.beginPath();
    ctx.arc(0, 0, size * 2.05, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (creep.bossPhase) {
      ctx.strokeStyle = `rgba(255,180,110,${0.4 + Math.sin(time * 6) * 0.18})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, size * 2.35, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  if (creep.elite && creep.alive) {
    const affix = AFFIXES[creep.elite];
    ctx.strokeStyle = affix.color;
    ctx.globalAlpha = (0.55 + Math.sin(creep.progress * 7) * 0.18) * fade;
    ctx.lineWidth = 2;
    ctx.setLineDash([size * 0.42, size * 0.3]);
    ctx.lineDashOffset = creep.progress * -cell * 0.3;
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.75, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = fade * 0.95;
    ctx.fillStyle = affix.color;
    ctx.font = `700 ${Math.max(6, cell * 0.095)}px Figtree, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(affix.tag.toUpperCase(), 0, -size * 1.75);
    ctx.globalAlpha = fade;
  }
  if (creep.wardT && creep.wardT > 0 && creep.alive) {
    ctx.strokeStyle = `rgba(150,220,230,${0.5 + Math.sin(time * 5) * 0.2})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(a) * size * 1.55;
      const py = Math.sin(a) * size * 1.55;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }
  if (creep.kind === "shaman" && creep.alive) {
    ctx.strokeStyle = "rgba(122,90,168,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, size * (1.35 + Math.sin(creep.healT * 6) * 0.08), 0, Math.PI * 2);
    ctx.stroke();
  }
  if (creep.kind === "shell") {
    ctx.fillStyle = "rgba(90,100,80,0.45)";
    ctx.beginPath();
    ctx.ellipse(0, size * 0.05, size * 1.05, size * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (creep.slowT > 0 && creep.alive) {
    ctx.fillStyle = "rgba(106,168,180,0.28)";
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.45, 0, Math.PI * 2);
    ctx.fill();
  }
  if (creep.rootT > 0 && creep.alive) {
    ctx.strokeStyle = "#4a6a32";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.2, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (creep.kind === "knave" && creep.dodge && creep.alive) {
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = "rgba(232,220,196,0.55)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, -size * 0.08, size * 1.45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (creep.hasteT > 0 && creep.alive) {
    ctx.strokeStyle = "rgba(224,120,56,0.7)";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, -size * 0.06, size * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (creep.kind === "ashfang" && creep.alive) {
    ctx.fillStyle = "rgba(224,120,56,0.18)";
    ctx.beginPath();
    ctx.arc(0, -size * 0.12, size * 1.15, 0, Math.PI * 2);
    ctx.fill();
  }
  if (marked && creep.alive) {
    ctx.strokeStyle = EMBER;
    ctx.lineWidth = 2.4;
    ctx.globalAlpha = 0.55 + Math.sin(creep.progress * 8) * 0.2;
    ctx.beginPath();
    ctx.arc(0, -size * 0.1, size * 1.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = fade;
  }
  if (creep.alive && creep.progress >= pathLen - 2.2) {
    ctx.strokeStyle = BLOOD;
    ctx.globalAlpha = 0.45 * fade;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = fade;
  }
  ctx.fillStyle = "rgba(18,22,15,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, size * 0.7, size * 0.85, size * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  if (drawSprite(ctx, creep.kind, 0, size * 0.35, size * 2.15, { alpha: fade, flip: Math.cos(creep.facing) < 0 })) {
    if (creep.alive && creep.kind === "lord") {
      ctx.save();
      ctx.globalAlpha = 0.86 * fade;
      ctx.fillStyle = PARCHMENT;
      ctx.font = `700 ${Math.max(7, cell * 0.13)}px Figtree, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(18,22,15,0.9)";
      ctx.shadowBlur = 4;
      ctx.fillText((creep.bossName ?? "Emberlord").toUpperCase(), 0, -size * 1.48);
      ctx.restore();
    }
    if (creep.alive && creep.flash > 0) {
      ctx.globalAlpha = creep.flash * 0.35;
      ctx.fillStyle = "#fff6e0";
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.15, size * 0.55, size * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (creep.alive && creep.hp < creep.maxHp) {
      ctx.save();
      ctx.globalAlpha = fade;
      const barW = size * 1.55;
      ctx.fillStyle = "rgba(18,22,15,0.72)";
      ctx.fillRect(px - barW / 2, py - size - 8, barW, 4);
      ctx.fillStyle = creep.hp / creep.maxHp > 0.4 ? "#7a9a58" : BLOOD;
      ctx.fillRect(px - barW / 2, py - size - 8, barW * Math.max(0, creep.hp / creep.maxHp), 4);
      ctx.restore();
    }
    return;
  }
  ctx.fillStyle =
    creep.kind === "wisp" ? EMBER : creep.kind === "shaman" ? "#6a4a78" : creep.kind === "shell" ? STONE_LIT : "#6d8a4a";
  ctx.beginPath();
  ctx.ellipse(0, 0, size, size * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function loftOf(shot: { x: number; y: number; ox?: number; oy?: number; tx?: number; ty?: number; kind: string }) {
  if ((shot.kind !== "mortar" && shot.kind !== "cinder") || shot.ox == null || shot.oy == null || shot.tx == null || shot.ty == null) return 0;
  const tot = Math.hypot(shot.tx - shot.ox, shot.ty - shot.oy) || 1;
  const done = Math.min(1, Math.hypot(shot.x - shot.ox, shot.y - shot.oy) / tot);
  return Math.sin(done * Math.PI) * 0.55;
}

function drawShot(
  ctx: CanvasRenderingContext2D,
  shot: {
    x: number;
    y: number;
    px: number;
    py: number;
    kind: string;
    angle?: number;
    ox?: number;
    oy?: number;
    tx?: number;
    ty?: number;
  },
  cell: number,
  motion = true,
) {
  const loft = loftOf(shot);
  const x = shot.x * cell;
  const y = (shot.y - loft) * cell;
  const ang = shot.angle ?? Math.atan2(shot.y - shot.py, shot.x - shot.px);
  const key =
    shot.kind === "bow" || shot.kind === "pike"
      ? "shot-bow"
      : shot.kind === "mortar" || shot.kind === "cinder"
        ? "shot-mortar"
        : shot.kind === "frost"
          ? "shot-frost"
          : shot.kind === "bramble"
            ? "shot-bramble"
            : null;
  const img = key ? spr(key) : null;
  if (motion && shot.kind !== "mortar" && shot.kind !== "cinder") {
    const prevX = shot.px * cell;
    const prevY = shot.py * cell;
    const tint = shot.kind === "frost" ? "106,168,180" : "232,197,106";
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.strokeStyle = `rgba(${tint},0.28)`;
    ctx.lineWidth = Math.max(2.4, cell * 0.09);
    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.strokeStyle = `rgba(${tint},0.75)`;
    ctx.lineWidth = Math.max(1.2, cell * 0.035);
    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.fillStyle = `rgba(${tint},0.55)`;
    ctx.beginPath();
    ctx.arc(x, y, cell * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(shot.kind === "mortar" ? ang * 0.18 : ang);
  if (img) {
    const grow = 1 + (((shot as { form?: number }).form ?? 1) - 1) * 0.07;
    const h =
      (shot.kind === "mortar" ? cell * 0.4 : shot.kind === "bow" ? cell * 0.32 : shot.kind === "frost" ? cell * 0.36 : cell * 0.34) *
      grow;
    const w = (img.naturalWidth / img.naturalHeight) * h;
    ctx.drawImage(img, -w * 0.55, -h / 2, w, h);
    ctx.restore();
    return;
  }
  if (shot.kind === "bow") {
    ctx.strokeStyle = "#8a6a42";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-cell * 0.22, 0);
    ctx.lineTo(cell * 0.16, 0);
    ctx.stroke();
    ctx.fillStyle = COPPER;
    ctx.beginPath();
    ctx.moveTo(cell * 0.22, 0);
    ctx.lineTo(cell * 0.1, -cell * 0.05);
    ctx.lineTo(cell * 0.1, cell * 0.05);
    ctx.fill();
    ctx.strokeStyle = "#6a3040";
    ctx.beginPath();
    ctx.moveTo(-cell * 0.22, 0);
    ctx.lineTo(-cell * 0.28, -cell * 0.06);
    ctx.moveTo(-cell * 0.22, 0);
    ctx.lineTo(-cell * 0.28, cell * 0.06);
    ctx.stroke();
  } else if (shot.kind === "mortar") {
    ctx.fillStyle = "#3a3a38";
    ctx.beginPath();
    ctx.arc(0, 0, cell * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COPPER;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = EMBER;
    ctx.beginPath();
    ctx.moveTo(0, -cell * 0.12);
    ctx.lineTo(cell * 0.04, -cell * 0.2);
    ctx.stroke();
  } else if (shot.kind === "frost") {
    ctx.fillStyle = FROST;
    ctx.beginPath();
    ctx.moveTo(cell * 0.2, 0);
    ctx.lineTo(-cell * 0.08, -cell * 0.08);
    ctx.lineTo(-cell * 0.16, 0);
    ctx.lineTo(-cell * 0.08, cell * 0.08);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = "#4a6a32";
    ctx.beginPath();
    ctx.moveTo(cell * 0.2, 0);
    ctx.lineTo(-cell * 0.14, -cell * 0.06);
    ctx.lineTo(-cell * 0.1, 0);
    ctx.lineTo(-cell * 0.14, cell * 0.06);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, engine: EmberEngine, cell: number) {
  if (engine.particles.length === 0) return;
  ctx.save();
  let composite: GlobalCompositeOperation = "source-over";
  const setComposite = (mode: GlobalCompositeOperation) => {
    if (composite !== mode) {
      ctx.globalCompositeOperation = mode;
      composite = mode;
    }
  };
  for (const p of engine.particles) {
    const t = Math.max(0, p.life / p.max);
    const rad = Math.max(1, p.size * cell);
    const x = p.x * cell;
    const y = p.y * cell;
    if (p.kind === "ring") {
      setComposite("source-over");
      ctx.globalAlpha = t * 0.72;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(1.5, cell * 0.04);
      ctx.beginPath();
      ctx.arc(x, y, rad * (1.2 + (1 - t) * 1.7), 0, Math.PI * 2);
      ctx.stroke();
      if (!engine.reducedMotion && t > 0.45) {
        setComposite("lighter");
        ctx.globalAlpha = (t - 0.45) * 1.6;
        ctx.strokeStyle = "#fff6dc";
        ctx.lineWidth = Math.max(1, cell * 0.02);
        ctx.stroke();
      }
      continue;
    }
    if (p.kind === "shard") {
      ctx.save();
      ctx.globalAlpha = t;
      ctx.translate(x, y);
      ctx.rotate(p.rot + (1 - t) * 2.4);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(rad * 2.4, 0);
      ctx.lineTo(0, -rad * 0.72);
      ctx.lineTo(-rad * 1.5, 0);
      ctx.lineTo(0, rad * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      continue;
    }
    if (p.kind === "smoke") {
      setComposite("source-over");
      ctx.globalAlpha = t * 0.4;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(x, y, rad * (1.4 + (1 - t) * 0.9), 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    setComposite("lighter");
    ctx.globalAlpha = t * 0.85;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(x, y, rad * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = t * 0.55;
    ctx.beginPath();
    ctx.arc(x, y, rad * 1.35, 0, Math.PI * 2);
    ctx.fill();
    if (p.kind === "ember" && cell > 20) {
      ctx.globalAlpha = t * 0.5;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(1, rad * 0.8);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - p.vx * cell * 0.06, y - p.vy * cell * 0.06);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawFloaters(ctx: CanvasRenderingContext2D, engine: EmberEngine, cell: number) {
  if (engine.floaters.length === 0) return;
  ctx.save();
  ctx.font = `700 ${Math.min(16, Math.max(11, cell * 0.14))}px Figtree, sans-serif`;
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(18,22,15,0.85)";
  for (const f of engine.floaters) {
    const t = f.life / f.max;
    const age = 1 - t;
    const pop = age < 0.16 ? 0.72 + (age / 0.16) * 0.34 : 1.06 - Math.min(1, (age - 0.16) / 0.84) * 0.08;
    const fx = Math.min(COLS * cell - 8, Math.max(8, f.x * cell));
    const fy = Math.min(ROWS * cell - 8, Math.max(14, f.y * cell));
    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 1.6);
    ctx.translate(fx, fy);
    ctx.scale(pop, pop);
    ctx.strokeText(f.text, 0, 0);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

function drawBanner(ctx: CanvasRenderingContext2D, engine: EmberEngine, w: number, cell: number) {
  if (!engine.banner) return;
  const t = engine.banner.life / engine.banner.max;
  const enter = Math.min(1, (1 - t) * 4.5);
  const pop = 0.82 + enter * 0.18;
  ctx.save();
  ctx.globalAlpha = Math.min(1, t * 2);
  ctx.translate(w / 2, cell * 0.7);
  ctx.scale(pop, pop);
  ctx.font = `700 ${Math.max(16, cell * 0.38)}px Fraunces, serif`;
  ctx.textAlign = "center";
  ctx.lineWidth = Math.max(3, cell * 0.09);
  ctx.strokeStyle = "rgba(18,22,15,0.85)";
  ctx.strokeText(engine.banner.text, 0, 0);
  ctx.globalAlpha = Math.min(1, t * 2) * 0.45;
  ctx.fillStyle = EMBER;
  ctx.fillText(engine.banner.text, 1.5, 1.5);
  ctx.globalAlpha = Math.min(1, t * 2);
  ctx.fillStyle = PARCHMENT;
  ctx.fillText(engine.banner.text, 0, 0);
  ctx.restore();
}
