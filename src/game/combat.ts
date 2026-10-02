import type { TowerKind } from "./config.ts";

export const REACTION_BONUS = 0.3;
export const REACTION_COOLDOWN = 2;
export const RALLY_MAX = 100;
export const RALLY_KILL_GAIN = 5;
export const RALLY_REACTION_GAIN = 10;
export const RALLY_BREACH_LOSS = 20;
export const RALLY_DURATION = 6;
export const RALLY_RATE = 1.25;

export interface CombatEntry {
  source: TowerKind | "watch";
  damage: number;
  hits: number;
  kills: number;
}
export const REACTIONS = {
  shatter: {
    name: "Shatter",
    setup: "Frost → Mortar / Pike",
    detail: "Heavy hits deal 30% more damage to frost-chilled prey.",
    color: "#a8e1e8",
  },
  kindle: {
    name: "Kindle",
    setup: "Root → Mortar / Cinder",
    detail: "Fire hits deal 30% more damage to rooted prey.",
    color: "#f6bb6c",
  },
} as const;

export type ReactionKind = keyof typeof REACTIONS;

export function reactionFor(
  source: TowerKind | undefined,
  prey: { chillT?: number; rootT: number; reactionReadyAt?: number },
  time: number,
): ReactionKind | null {
  if (time < (prey.reactionReadyAt ?? 0)) return null;
  if ((prey.chillT ?? 0) > 0 && (source === "mortar" || source === "pike")) return "shatter";
  if (prey.rootT > 0 && (source === "mortar" || source === "cinder")) return "kindle";
  return null;
}
