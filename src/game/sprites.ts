const KEYS = [
  "bow",
  "mortar",
  "frost",
  "spark",
  "bramble",
  "ward",
  "grub",
  "runner",
  "shell",
  "wisp",
  "shaman",
  "hound",
  "lord",
  "keep",
  "gate",
  "pine",
  "rock",
] as const;

export type SpriteKey = (typeof KEYS)[number];

const images: Partial<Record<SpriteKey | "grass" | "path" | "shot-bow" | "shot-mortar" | "shot-frost" | "shot-bramble", HTMLImageElement>> = {};

const SHOTS = ["shot-bow", "shot-mortar", "shot-frost", "shot-bramble"] as const;

export function loadSprites() {
  if (typeof Image === "undefined") return;
  for (const key of KEYS) {
    if (images[key]) continue;
    const img = new Image();
    img.src = `/assets/sprites/${key}.png?v=3`;
    images[key] = img;
  }
  for (const key of SHOTS) {
    if (images[key]) continue;
    const img = new Image();
    img.src = `/assets/sprites/${key}.png?v=1`;
    images[key] = img;
  }
  if (!images.grass) {
    const grass = new Image();
    grass.src = "/assets/tiles/grass.jpg";
    images.grass = grass;
  }
  if (!images.path) {
    const path = new Image();
    path.src = "/assets/tiles/path.jpg";
    images.path = path;
  }
}

export function spr(key: SpriteKey | "grass" | "path" | "shot-bow" | "shot-mortar" | "shot-frost" | "shot-bramble"): HTMLImageElement | null {
  const img = images[key];
  if (!img || !img.complete || img.naturalWidth < 4) return null;
  return img;
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  key: SpriteKey,
  x: number,
  y: number,
  size: number,
  opts?: { flip?: boolean; alpha?: number },
) {
  const img = spr(key);
  if (!img) return false;
  ctx.save();
  ctx.globalAlpha = opts?.alpha ?? 1;
  ctx.translate(x, y);
  if (opts?.flip) ctx.scale(-1, 1);
  const h = size;
  const w = (img.naturalWidth / img.naturalHeight) * h;
  ctx.drawImage(img, -w / 2, -h * 0.88, w, h);
  ctx.restore();
  return true;
}
