/**
 * Stable runtime contract for the art pack.
 *
 * Blender or image-generation exports can replace the files in this directory
 * without changing game code. Bumping the revision also avoids stale browser
 * cache when a sprite is refreshed in place.
 */
export const ASSET_REVISION = "v4";

export const SPRITE_KEYS = [
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

export type SpriteAsset = (typeof SPRITE_KEYS)[number];

export function spriteUrl(key: string) {
  return `/assets/sprites/${key}.png?${ASSET_REVISION}`;
}

export const ROUTE_MARKER_REVISION = "v1";

export const ROUTE_MARKER_KEYS = ["low-road", "pine-cut", "keep-stair", "river-ford", "ember-copse"] as const;

export type RouteMarkerAsset = (typeof ROUTE_MARKER_KEYS)[number];

export function routeMarkerUrl(key: string) {
  return `/assets/sprites/route-${key}-${ROUTE_MARKER_REVISION}.png`;
}

export const RELIC_ASSET_REVISION = "v1";

export const RELIC_ASSET_KEYS = ["purse", "timber", "whet", "oil", "cold", "glass", "salt", "ember", "adze", "cord", "flint"] as const;

export type RelicAsset = (typeof RELIC_ASSET_KEYS)[number];

export function relicUrl(key: string) {
  return `/assets/relics/relic-${key}-${RELIC_ASSET_REVISION}.png`;
}
