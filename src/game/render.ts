import { COLS, ROWS, rangeAt, towerForm, type PropKind } from "./config";
import { type Creep, type EmberEngine, type Tower } from "./engine";
import { drawSprite, spr } from "./sprites";

const PATH_EDGE = "#4a3a22";
const PARCHMENT = "#e8dcc4";
const COPPER = "#d4a054";
const EMBER = "#e07838";
const FROST = "#6aa8b4";
const BLOOD = "#c45c4a";
const STONE = "#4a5244";
const STONE_LIT = "#6a7460";
const BARK = "#1c2318";

function nsin(t: number, seed: number) {
  return Math.sin(t * seed) * 0.55 + Math.sin(t * seed * 1.73 + seed) * 0.45;
}

export function drawWorld(ctx: CanvasRenderingContext2D, engine: EmberEngine, cell: number, w: number, h: number) {
  ctx.save();
  const shake = engine.reducedMotion ? 0 : engine.trauma * engine.trauma;
  if (shake > 0.002) {
    ctx.translate(nsin(engine.time * 28, 2.1) * 9 * shake, nsin(engine.time * 31, 3.4) * 8 * shake);
    ctx.rotate(nsin(engine.time * 22, 1.7) * 0.012 * shake);
  }

  ctx.fillStyle = engine.map.theme.ink;
  ctx.fillRect(-20, -20, w + 40, h + 40);

  drawGround(ctx, cell, engine.time, engine);
  drawPath(ctx, cell, engine);
  drawWater(ctx, cell, engine.time, engine);

  const spawn = engine.path[0];
  const base = engine.path[engine.path.length - 1];
  drawPortal(ctx, (spawn.c + 0.5) * cell, (spawn.r + 0.5) * cell, cell, engine.time, engine.phase === "wave");
  drawKeep(ctx, (base.c + 0.5) * cell, (base.r + 0.5) * cell, cell, engine.time, engine.lives);
  for (const prop of engine.props) {
    if (prop.kind !== "lamp") continue;
    const lx = (prop.c + 0.5) * cell;
    const ly = (prop.r + 0.45) * cell;
    const g = ctx.createRadialGradient(lx, ly, 2, lx, ly, cell * 1.35);
    g.addColorStop(0, "rgba(224,120,56,0.22)");
    g.addColorStop(1, "rgba(224,120,56,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(lx, ly, cell * 1.35, 0, Math.PI * 2);
    ctx.fill();
  }
  drawHover(ctx, engine, cell);

  const actors: Array<{ y: number; z: number; draw: () => void }> = [];
  for (const prop of engine.props) {
    actors.push({
      y: prop.r + 0.55,
      z: -1,
      draw: () => drawProp(ctx, prop.c, prop.r, prop.kind, cell, engine.time),
    });
  }
  for (const t of engine.towers) {
    actors.push({
      y: t.r + 0.5,
      z: 0,
      draw: () => drawTower(ctx, t, cell, t.id === engine.selectedId, engine.time, engine),
    });
  }
  for (const c of engine.creeps) {
    actors.push({
      y: c.y,
      z: 1,
      draw: () => drawCreep(ctx, c, cell, engine.path.length),
    });
  }
  actors.sort((a, b) => a.y - b.y || a.z - b.z);
  for (const a of actors) a.draw();

  for (const burn of engine.burns) {
    ctx.save();
    ctx.globalAlpha = Math.max(0.12, burn.life / 2.4) * 0.45;
    ctx.fillStyle = EMBER;
    ctx.beginPath();
    ctx.ellipse(burn.x * cell, burn.y * cell, burn.r * cell, burn.r * cell * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  for (const s of engine.shots) drawShot(ctx, s, cell);
  for (const b of engine.beams) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, b.life / b.max);
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.x1 * cell, b.y1 * cell);
    ctx.lineTo(b.x2 * cell, b.y2 * cell);
    ctx.stroke();
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

  const vg = ctx.createRadialGradient(w * 0.5, h * 0.45, cell * 2, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, engine.map.id === "keep-stair" ? "rgba(22,14,12,0.55)" : "rgba(18,22,15,0.42)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(58,68,50,0.9)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, COLS * cell - 2, ROWS * cell - 2);
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

function drawGround(ctx: CanvasRenderingContext2D, cell: number, time: number, engine: EmberEngine) {
  ctx.fillStyle = engine.map.theme.moss;
  ctx.fillRect(0, 0, COLS * cell, ROWS * cell);
  const grass = spr("grass");
  if (grass) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.drawImage(grass, 0, 0, COLS * cell, ROWS * cell);
    ctx.restore();
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (engine.pathSet.has(`${c},${r}`)) continue;
      if (nearPath(c, r, engine)) {
        ctx.fillStyle = engine.map.theme.bank;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(c * cell, r * cell, cell + 0.6, cell + 0.6);
        ctx.globalAlpha = 1;
      }
      const seed = (c * 17 + r * 31) % 7;
      if (engine.blockedSet.has(`${c},${r}`) || (seed !== 0 && seed !== 3)) continue;
      const gx = c * cell + cell * 0.35;
      const gy = r * cell + cell * 0.62;
      const sway = Math.sin(time * 1.6 + c) * 1.4;
      ctx.strokeStyle = "rgba(90,122,72,0.35)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.quadraticCurveTo(gx + sway, gy - cell * 0.2, gx + 3 + sway, gy - cell * 0.28);
      ctx.stroke();
    }
  }
}

function drawWater(ctx: CanvasRenderingContext2D, cell: number, time: number, engine: EmberEngine) {
  const wet = new Set(engine.map.water.map(([c, r]) => `${c},${r}`));
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
    ctx.globalAlpha = 0.32 + Math.sin(time * 2 + c) * 0.1;
    ctx.fillStyle = engine.map.theme.waterLit;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, cell * 0.26, cell * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function strokeRoute(ctx: CanvasRenderingContext2D, engine: EmberEngine, cell: number) {
  const path = engine.path;
  ctx.beginPath();
  path.forEach((p, i) => {
    const x = (p.c + 0.5) * cell;
    const y = (p.r + 0.5) * cell;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
}

function drawPath(ctx: CanvasRenderingContext2D, cell: number, engine: EmberEngine) {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = PATH_EDGE;
  ctx.lineWidth = cell * 0.94;
  strokeRoute(ctx, engine, cell);
  ctx.stroke();
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
  ctx.strokeStyle = "rgba(212,160,84,0.3)";
  ctx.lineWidth = Math.max(1.4, cell * 0.04);
  ctx.setLineDash([cell * 0.26, cell * 0.2]);
  ctx.lineDashOffset = -engine.time * 22;
  strokeRoute(ctx, engine, cell);
  ctx.stroke();
  ctx.setLineDash([]);
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

function drawHover(ctx: CanvasRenderingContext2D, engine: EmberEngine, cell: number) {
  const glass = engine.relics.has("glass") ? 1.12 : 1;
  const selected = engine.selectedTower();
  if (selected) {
    const range = rangeAt(selected.kind, selected.dmgLvl) * glass;
    ctx.beginPath();
    ctx.arc((selected.c + 0.5) * cell, (selected.r + 0.5) * cell, range * cell, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(212,160,84,0.08)";
    ctx.fill();
    ctx.strokeStyle = "rgba(212,160,84,0.5)";
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
  if (engine.selectedKind && engine.towers.length < 4 && (engine.phase === "ready" || engine.phase === "wave")) {
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
    const range = rangeAt(engine.selectedKind, 1) * glass;
    ctx.strokeStyle = "rgba(232,220,196,0.35)";
    ctx.beginPath();
    ctx.arc((engine.hoverC + 0.5) * cell, (engine.hoverR + 0.5) * cell, range * cell, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function easeOutBack(t: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

function drawTower(ctx: CanvasRenderingContext2D, tower: Tower, cell: number, selected: boolean, time: number, engine: EmberEngine) {
  const x = (tower.c + 0.5) * cell;
  const y = (tower.r + 0.5) * cell;
  const pop = easeOutBack(Math.min(1, tower.build));
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 2.1 + tower.id) * 1.1);
  ctx.scale(pop, pop);
  ctx.fillStyle = "rgba(18,22,15,0.38)";
  ctx.beginPath();
  ctx.ellipse(0, cell * 0.22, cell * 0.3, cell * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();
  if (selected) {
    ctx.strokeStyle = `rgba(232,220,196,${0.45 + Math.sin(time * 4) * 0.2})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(-cell * 0.38, -cell * 0.44, cell * 0.76, cell * 0.74);
  }
  const form = towerForm(tower.dmgLvl, tower.rateLvl);
  const size = cell * (0.84 + form * 0.07);
  if (form >= 2) {
    ctx.strokeStyle = form >= 4 ? EMBER : form === 3 ? COPPER : "rgba(212,160,84,0.55)";
    ctx.lineWidth = form >= 3 ? 2.4 : 1.6;
    ctx.beginPath();
    ctx.ellipse(0, cell * 0.2, cell * (0.22 + form * 0.03), cell * 0.09, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (form >= 3) {
    ctx.globalAlpha = 0.28 + Math.sin(time * 5 + tower.id) * 0.08;
    ctx.fillStyle = form >= 4 ? EMBER : COPPER;
    ctx.beginPath();
    ctx.arc(0, -cell * 0.08, cell * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (drawSprite(ctx, tower.kind, 0, cell * 0.12, size)) {
    if (form >= 4) {
      ctx.fillStyle = COPPER;
      ctx.beginPath();
      ctx.moveTo(0, -cell * 0.48);
      ctx.lineTo(cell * 0.08, -cell * 0.34);
      ctx.lineTo(-cell * 0.08, -cell * 0.34);
      ctx.fill();
    }
    for (let i = 0; i < form; i++) {
      ctx.fillStyle = i < tower.dmgLvl ? EMBER : COPPER;
      ctx.fillRect(-cell * 0.16 + i * cell * 0.09, cell * 0.22, cell * 0.07, cell * 0.05);
    }
    if (selected) {
      ctx.fillStyle = PARCHMENT;
      ctx.font = `700 ${Math.max(8, cell * 0.16)}px Figtree, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(
        (tower.aim ?? "first") === "close" ? "NEAR" : (tower.aim ?? "first") === "strong" ? "TOUGH" : (tower.aim ?? "first").toUpperCase(),
        0,
        -cell * 0.46,
      );
    }
    ctx.restore();
    return;
  }
  ctx.fillStyle = BARK;
  ctx.beginPath();
  ctx.ellipse(0, cell * 0.14, cell * 0.24, cell * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = tower.kind === "frost" ? FROST : tower.kind === "spark" ? COPPER : tower.kind === "ward" ? "#c4a060" : tower.kind === "bramble" ? "#4a6a32" : "#6d8a4a";
  ctx.beginPath();
  ctx.arc(0, -cell * 0.08, cell * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCreep(ctx: CanvasRenderingContext2D, creep: Creep, cell: number, pathLen: number) {
  const px = creep.x * cell;
  const py = creep.y * cell;
  const fade = creep.alive ? 1 : Math.max(0, creep.death);
  const size = (creep.kind === "lord" ? 0.38 : creep.kind === "shell" ? 0.28 : creep.kind === "hound" ? 0.22 : 0.2) * cell;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(creep.facing);
  ctx.globalAlpha = fade;
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
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = fade;
    const barW = size * 1.55;
    ctx.fillStyle = "rgba(18,22,15,0.72)";
    ctx.fillRect(px - barW / 2, py - size - 8, barW, 4);
    ctx.fillStyle = creep.hp / creep.maxHp > 0.4 ? "#7a9a58" : BLOOD;
    ctx.fillRect(px - barW / 2, py - size - 8, barW * Math.max(0, creep.hp / creep.maxHp), 4);
    ctx.restore();
    return;
  }
  ctx.fillStyle =
    creep.kind === "wisp" ? EMBER : creep.kind === "shaman" ? "#6a4a78" : creep.kind === "shell" ? STONE_LIT : "#6d8a4a";
  ctx.beginPath();
  ctx.ellipse(0, 0, size, size * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShot(ctx: CanvasRenderingContext2D, shot: { x: number; y: number; px: number; py: number; kind: string }, cell: number) {
  const color = shot.kind === "frost" ? FROST : shot.kind === "mortar" ? EMBER : COPPER;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = shot.kind === "mortar" ? 7 : 5;
  ctx.beginPath();
  ctx.moveTo(shot.px * cell, shot.py * cell);
  ctx.lineTo(shot.x * cell, shot.y * cell);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.lineWidth = shot.kind === "mortar" ? 3.2 : 2;
  ctx.beginPath();
  ctx.moveTo(shot.px * cell, shot.py * cell);
  ctx.lineTo(shot.x * cell, shot.y * cell);
  ctx.stroke();
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, engine: EmberEngine, cell: number) {
  for (const p of engine.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x * cell, p.y * cell, Math.max(1, p.size * cell), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawFloaters(ctx: CanvasRenderingContext2D, engine: EmberEngine, cell: number) {
  for (const f of engine.floaters) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, f.life / f.max);
    ctx.fillStyle = f.color;
    ctx.font = `700 ${Math.max(10, cell * 0.22)}px Figtree, sans-serif`;
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(18,22,15,0.8)";
    ctx.shadowBlur = 6;
    ctx.fillText(f.text, f.x * cell, f.y * cell);
    ctx.restore();
  }
}

function drawBanner(ctx: CanvasRenderingContext2D, engine: EmberEngine, w: number, cell: number) {
  if (!engine.banner) return;
  const t = engine.banner.life / engine.banner.max;
  ctx.save();
  ctx.globalAlpha = Math.min(1, t * 2);
  ctx.fillStyle = PARCHMENT;
  ctx.font = `700 ${Math.max(16, cell * 0.38)}px Fraunces, serif`;
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(18,22,15,0.85)";
  ctx.shadowBlur = 10;
  ctx.fillText(engine.banner.text, w / 2, cell * 0.7);
  ctx.restore();
}
