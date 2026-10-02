import { BATTLEFIELD_ART, SPRITE_KEYS, spriteUrl } from "./assets.ts";

const KEYS = SPRITE_KEYS;

export type SpriteKey = (typeof KEYS)[number];

type ImageKey =
  | SpriteKey
  | "grass"
  | "path"
  | "woodland"
  | "grub-crawl"
  | "shot-bow"
  | "shot-mortar"
  | "shot-frost"
  | "shot-bramble";
const images: Partial<Record<ImageKey, HTMLImageElement>> = {};

const SHOTS = ["shot-bow", "shot-mortar", "shot-frost", "shot-bramble"] as const;

export function loadSprites() {
  if (typeof Image === "undefined") return;
  for (const [key, url] of [
    ["woodland", BATTLEFIELD_ART.ground],
    ["grub-crawl", BATTLEFIELD_ART.grubCrawl],
  ] as const) {
    if (images[key]) continue;
    const img = new Image();
    img.src = url;
    images[key] = img;
  }
  for (const key of KEYS) {
    if (images[key]) continue;
    const img = new Image();
    img.src = spriteUrl(key);
    images[key] = img;
  }
  for (const key of SHOTS) {
    if (images[key]) continue;
    const img = new Image();
    img.src = spriteUrl(key);
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

export function spr(key: ImageKey): HTMLImageElement | null {
  const img = images[key];
  if (!img || !img.complete || img.naturalWidth < 4) return null;
  return img;
}

export function drawGrubFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  stride: number,
  flip: boolean,
  alpha: number,
) {
  const img = spr("grub-crawl");
  if (!img) return false;
  const frame = Math.floor(stride * 10) % 4;
  const width = img.naturalWidth / 4;
  const top = img.naturalHeight * 0.28;
  const height = img.naturalHeight * 0.5;
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.globalAlpha = alpha;
  ctx.drawImage(
    img,
    frame * width,
    top,
    width,
    height,
    -size * 0.75,
    -size * 0.88,
    size * 1.5,
    size,
  );
  ctx.restore();
  return true;
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
