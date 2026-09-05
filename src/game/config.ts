export const COLS = 13;
export const ROWS = 9;
export const START_GOLD = 280;
export const START_LIVES = 20;
export const TOTAL_WAVES = 16;
export const REFUND_RATE = 0.55;
export const MAX_UPGRADE = 4;
export const FORM_NAME = ["", "Timber", "Bound", "Tempered", "Crowned"] as const;

export function towerForm(dmgLvl: number, rateLvl: number) {
  return Math.max(1, Math.min(MAX_UPGRADE, Math.max(dmgLvl, rateLvl))) as 1 | 2 | 3 | 4;
}
export const TICK = 1 / 60;
export const HORN_COST = 45;
export const HORN_CD = 16;
export const MEND_COST = 70;

export const PATH: ReadonlyArray<{ c: number; r: number }> = [
  { c: 0, r: 5 },
  { c: 2, r: 5 },
  { c: 2, r: 2 },
  { c: 6, r: 2 },
  { c: 6, r: 7 },
  { c: 10, r: 7 },
  { c: 10, r: 3 },
  { c: 12, r: 3 },
];

export type TowerKind = "bow" | "mortar" | "frost" | "spark" | "bramble" | "ward";
export type CreepKind = "grub" | "runner" | "shell" | "wisp" | "shaman" | "hound" | "lord";
export type Aim = "first" | "last" | "close" | "strong";
export type PropKind = "pine" | "oak" | "rock" | "stump" | "reed" | "lamp" | "shroom" | "cart" | "fence";

export const PROPS: ReadonlyArray<{ c: number; r: number; kind: PropKind }> = [
  { c: 0, r: 0, kind: "pine" },
  { c: 1, r: 0, kind: "oak" },
  { c: 0, r: 1, kind: "pine" },
  { c: 2, r: 0, kind: "lamp" },
  { c: 3, r: 0, kind: "shroom" },
  { c: 4, r: 0, kind: "rock" },
  { c: 5, r: 0, kind: "fence" },
  { c: 7, r: 0, kind: "pine" },
  { c: 8, r: 0, kind: "oak" },
  { c: 9, r: 0, kind: "lamp" },
  { c: 11, r: 0, kind: "oak" },
  { c: 12, r: 0, kind: "pine" },
  { c: 12, r: 1, kind: "pine" },
  { c: 0, r: 7, kind: "reed" },
  { c: 0, r: 8, kind: "reed" },
  { c: 1, r: 8, kind: "stump" },
  { c: 2, r: 8, kind: "cart" },
  { c: 3, r: 8, kind: "rock" },
  { c: 5, r: 8, kind: "shroom" },
  { c: 7, r: 8, kind: "fence" },
  { c: 8, r: 8, kind: "lamp" },
  { c: 11, r: 8, kind: "pine" },
  { c: 12, r: 8, kind: "oak" },
  { c: 12, r: 6, kind: "pine" },
  { c: 7, r: 4, kind: "rock" },
  { c: 8, r: 5, kind: "stump" },
  { c: 4, r: 4, kind: "oak" },
  { c: 9, r: 1, kind: "rock" },
  { c: 11, r: 5, kind: "shroom" },
  { c: 1, r: 6, kind: "lamp" },
];

export const TOWERS: Record<
  TowerKind,
  {
    id: TowerKind;
    name: string;
    short: string;
    blurb: string;
    cost: number;
    range: number;
    damage: number;
    fireRate: number;
    splash: number;
    slow: number;
    projectileSpeed: number;
    hitsAir: boolean;
    beam: boolean;
  }
> = {
  bow: {
    id: "bow",
    name: "Longbow",
    short: "Bow",
    blurb: "Fast shots. Hits air. Damage III pierces.",
    cost: 60,
    range: 2.45,
    damage: 14,
    fireRate: 1.7,
    splash: 0,
    slow: 0,
    projectileSpeed: 9.2,
    hitsAir: true,
    beam: false,
  },
  mortar: {
    id: "mortar",
    name: "Mortar",
    short: "Mortar",
    blurb: "Ground splash. Leaves burning oil. Misses wisps.",
    cost: 115,
    range: 2.2,
    damage: 34,
    fireRate: 0.52,
    splash: 1.2,
    slow: 0,
    projectileSpeed: 5.4,
    hitsAir: false,
    beam: false,
  },
  frost: {
    id: "frost",
    name: "Frost Spire",
    short: "Frost",
    blurb: "Chill. Hits air. Damage III bites a cluster.",
    cost: 90,
    range: 2.7,
    damage: 7,
    fireRate: 1.15,
    splash: 0,
    slow: 0.42,
    projectileSpeed: 8.1,
    hitsAir: true,
    beam: false,
  },
  spark: {
    id: "spark",
    name: "Spark Coil",
    short: "Spark",
    blurb: "Hitscan bolt. Best anti-air. Damage III chains.",
    cost: 140,
    range: 3.05,
    damage: 38,
    fireRate: 0.72,
    splash: 0,
    slow: 0,
    projectileSpeed: 20,
    hitsAir: true,
    beam: true,
  },
  bramble: {
    id: "bramble",
    name: "Bramble",
    short: "Thorn",
    blurb: "Point-blank thorns. Ground only. Damage III roots.",
    cost: 70,
    range: 1.55,
    damage: 9,
    fireRate: 3.1,
    splash: 0,
    slow: 0,
    projectileSpeed: 11,
    hitsAir: false,
    beam: false,
  },
  ward: {
    id: "ward",
    name: "Ash Ward",
    short: "Ward",
    blurb: "Pulse aura. Hits air. Slows the cell it watches.",
    cost: 85,
    range: 2.15,
    damage: 6,
    fireRate: 1.05,
    splash: 0,
    slow: 0.28,
    projectileSpeed: 0,
    hitsAir: true,
    beam: false,
  },
};

export const CREEPS: Record<
  CreepKind,
  {
    hp: number;
    speed: number;
    gold: number;
    armor: number;
    name: string;
    flying: boolean;
    heal: number;
  }
> = {
  grub: { hp: 44, speed: 1.12, gold: 8, armor: 0, name: "Grubs", flying: false, heal: 0 },
  runner: { hp: 26, speed: 2.05, gold: 10, armor: 0, name: "Runners", flying: false, heal: 0 },
  shell: { hp: 120, speed: 0.76, gold: 16, armor: 5, name: "Shells", flying: false, heal: 0 },
  wisp: { hp: 32, speed: 1.7, gold: 14, armor: 0, name: "Wisps", flying: true, heal: 0 },
  shaman: { hp: 88, speed: 0.88, gold: 22, armor: 2, name: "Shamans", flying: false, heal: 10 },
  hound: { hp: 38, speed: 2.28, gold: 12, armor: 1, name: "Hounds", flying: false, heal: 0 },
  lord: { hp: 920, speed: 0.58, gold: 120, armor: 8, name: "Emberlord", flying: false, heal: 0 },
};

export type WaveSpawn = { kind: CreepKind; count: number; gap: number; delay: number };

export const WAVES: WaveSpawn[][] = [
  [{ kind: "grub", count: 8, gap: 0.7, delay: 0 }],
  [{ kind: "grub", count: 12, gap: 0.52, delay: 0 }],
  [
    { kind: "grub", count: 8, gap: 0.48, delay: 0 },
    { kind: "runner", count: 6, gap: 0.36, delay: 2 },
  ],
  [{ kind: "shell", count: 4, gap: 1.05, delay: 0 }, { kind: "grub", count: 10, gap: 0.42, delay: 1 }],
  [
    { kind: "wisp", count: 8, gap: 0.4, delay: 0 },
    { kind: "grub", count: 8, gap: 0.4, delay: 1.6 },
  ],
  [
    { kind: "runner", count: 12, gap: 0.3, delay: 0 },
    { kind: "wisp", count: 6, gap: 0.34, delay: 2 },
  ],
  [
    { kind: "shell", count: 6, gap: 0.8, delay: 0 },
    { kind: "shaman", count: 2, gap: 1.4, delay: 1.2 },
  ],
  [
    { kind: "runner", count: 14, gap: 0.26, delay: 0 },
    { kind: "wisp", count: 8, gap: 0.3, delay: 1.8 },
  ],
  [
    { kind: "grub", count: 16, gap: 0.28, delay: 0 },
    { kind: "shell", count: 5, gap: 0.7, delay: 2.4 },
    { kind: "shaman", count: 2, gap: 1.2, delay: 3 },
  ],
  [
    { kind: "wisp", count: 14, gap: 0.26, delay: 0 },
    { kind: "runner", count: 10, gap: 0.28, delay: 2 },
  ],
  [
    { kind: "shell", count: 8, gap: 0.55, delay: 0 },
    { kind: "shaman", count: 3, gap: 1.1, delay: 1.5 },
    { kind: "wisp", count: 8, gap: 0.3, delay: 3 },
  ],
  [
    { kind: "runner", count: 16, gap: 0.24, delay: 0 },
    { kind: "shell", count: 7, gap: 0.55, delay: 2 },
    { kind: "wisp", count: 10, gap: 0.26, delay: 3.5 },
  ],
  [
    { kind: "grub", count: 20, gap: 0.22, delay: 0 },
    { kind: "shaman", count: 4, gap: 0.9, delay: 2 },
    { kind: "shell", count: 8, gap: 0.5, delay: 4 },
  ],
  [
    { kind: "wisp", count: 18, gap: 0.22, delay: 0 },
    { kind: "runner", count: 14, gap: 0.24, delay: 2 },
    { kind: "shaman", count: 3, gap: 1, delay: 4 },
  ],
  [
    { kind: "shell", count: 10, gap: 0.45, delay: 0 },
    { kind: "wisp", count: 12, gap: 0.24, delay: 2 },
    { kind: "shaman", count: 4, gap: 0.85, delay: 3.5 },
  ],
  [
    { kind: "shell", count: 8, gap: 0.48, delay: 0 },
    { kind: "wisp", count: 10, gap: 0.24, delay: 2 },
    { kind: "lord", count: 1, gap: 1, delay: 5 },
    { kind: "shaman", count: 3, gap: 1, delay: 6 },
    { kind: "grub", count: 14, gap: 0.24, delay: 7 },
  ],
];

export function upgradeDamageCost(kind: TowerKind, level: number): number {
  return Math.round(TOWERS[kind].cost * 0.45 * level);
}

export function upgradeRateCost(kind: TowerKind, level: number): number {
  return Math.round(TOWERS[kind].cost * 0.4 * level);
}

export function damageAt(kind: TowerKind, level: number): number {
  return TOWERS[kind].damage * (1 + 0.38 * (level - 1));
}

export function rateAt(kind: TowerKind, level: number): number {
  return TOWERS[kind].fireRate * (1 + 0.22 * (level - 1));
}

export function rangeAt(kind: TowerKind, dmgLvl: number): number {
  return TOWERS[kind].range * (1 + 0.09 * (dmgLvl - 1));
}

export function pathCells(): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i];
    const b = PATH[i + 1];
    if (a.c === b.c) {
      const step = a.r < b.r ? 1 : -1;
      for (let r = a.r; r !== b.r + step; r += step) set.add(`${a.c},${r}`);
    } else {
      const step = a.c < b.c ? 1 : -1;
      for (let c = a.c; c !== b.c + step; c += step) set.add(`${c},${a.r}`);
    }
  }
  return set;
}

export function blockedCells(): Set<string> {
  return new Set(PROPS.map((p) => `${p.c},${p.r}`));
}

export function describeWave(index: number): string {
  const plan = WAVES[index];
  if (!plan) return "—";
  return plan.map((p) => `${p.count} ${CREEPS[p.kind].name}`).join(" · ");
}
