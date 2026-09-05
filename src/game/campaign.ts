import { CREEPS, type CreepKind, type PropKind, type WaveSpawn } from "./config";

export type RelicId = "purse" | "timber" | "whet" | "oil" | "cold" | "glass" | "salt" | "ember" | "adze";

export interface ShopItem {
  id: RelicId;
  name: string;
  cost: number;
  blurb: string;
}

export interface StoryBeat {
  speaker: string;
  role: string;
  line: string;
}

export interface MapTheme {
  moss: string;
  lit: string;
  bank: string;
  path: string;
  pathLit: string;
  ink: string;
  water: string;
  waterLit: string;
}

export interface MapDef {
  id: string;
  name: string;
  place: string;
  path: ReadonlyArray<{ c: number; r: number }>;
  props: ReadonlyArray<{ c: number; r: number; kind: PropKind }>;
  water: ReadonlyArray<[number, number]>;
  waves: WaveSpawn[][];
  briefing: StoryBeat;
  victory: StoryBeat;
  asides: string[];
  theme: MapTheme;
}

export const SHOP: ShopItem[] = [
  { id: "purse", name: "Copper purse", cost: 80, blurb: "+50 gold at the start of every map." },
  { id: "timber", name: "Spare timber", cost: 70, blurb: "+2 keep lives on every map." },
  { id: "whet", name: "Whetstone", cost: 100, blurb: "All towers deal 12% more damage." },
  { id: "oil", name: "Horn oil", cost: 60, blurb: "Horn cools in 10s instead of 16." },
  { id: "cold", name: "Cold iron", cost: 90, blurb: "Frost bites harder and longer." },
  { id: "glass", name: "Scout glass", cost: 85, blurb: "Every tower sees 12% farther." },
  { id: "salt", name: "Witch salt", cost: 75, blurb: "Shamans heal half as much." },
  { id: "ember", name: "Ember flask", cost: 95, blurb: "Mortars and oil hit 20% harder." },
  { id: "adze", name: "Keep adze", cost: 70, blurb: "Tower upgrades cost 18% less." },
];

const UNLOCK: Record<RelicId, number> = {
  purse: 0,
  timber: 0,
  whet: 0,
  oil: 0,
  cold: 1,
  glass: 1,
  salt: 1,
  ember: 2,
  adze: 0,
};

export function shopFor(mapIndex: number, wave: number): ShopItem[] {
  return SHOP.filter((s) => UNLOCK[s.id] <= mapIndex).map((s) => ({
    ...s,
    cost: Math.max(18, s.cost - mapIndex * 16 - wave * 4),
  }));
}

export const MAPS: MapDef[] = [
  {
    id: "low-road",
    name: "The Low Road",
    place: "Emberford cut",
    theme: {
      moss: "#2a3524",
      lit: "#4a6840",
      bank: "#24301f",
      path: "#6b5330",
      pathLit: "#8a6c42",
      ink: "#12160f",
      water: "#2a3c3a",
      waterLit: "#3d5a52",
    },
    water: [
      [0, 7],
      [0, 8],
      [1, 8],
    ],
    path: [
      { c: 0, r: 5 },
      { c: 2, r: 5 },
      { c: 2, r: 2 },
      { c: 6, r: 2 },
      { c: 6, r: 7 },
      { c: 10, r: 7 },
      { c: 10, r: 3 },
      { c: 12, r: 3 },
    ],
    props: [
      { c: 0, r: 0, kind: "pine" },
      { c: 1, r: 0, kind: "oak" },
      { c: 0, r: 1, kind: "pine" },
      { c: 2, r: 0, kind: "lamp" },
      { c: 4, r: 0, kind: "rock" },
      { c: 8, r: 0, kind: "pine" },
      { c: 11, r: 0, kind: "oak" },
      { c: 12, r: 0, kind: "pine" },
      { c: 12, r: 1, kind: "pine" },
      { c: 2, r: 8, kind: "cart" },
      { c: 3, r: 8, kind: "rock" },
      { c: 7, r: 4, kind: "rock" },
      { c: 8, r: 5, kind: "stump" },
      { c: 4, r: 4, kind: "oak" },
      { c: 12, r: 6, kind: "pine" },
      { c: 12, r: 8, kind: "oak" },
      { c: 9, r: 1, kind: "rock" },
      { c: 1, r: 6, kind: "lamp" },
    ],
    waves: [
      [{ kind: "grub", count: 8, gap: 0.7, delay: 0 }],
      [{ kind: "grub", count: 12, gap: 0.5, delay: 0 }],
      [
        { kind: "grub", count: 6, gap: 0.48, delay: 0 },
        { kind: "hound", count: 5, gap: 0.32, delay: 1.4 },
        { kind: "runner", count: 4, gap: 0.36, delay: 2.4 },
      ],
      [{ kind: "shell", count: 4, gap: 1, delay: 0 }, { kind: "grub", count: 10, gap: 0.42, delay: 1 }],
    ],
    briefing: {
      speaker: "Captain Sera Venn",
      role: "Watch-captain",
      line: "They take the Low Road at dusk. Plant bows on the bends — grass only, never the dirt. Water and timber are sealed. A ward on the last turn buys the keep a breath when the hounds come.",
    },
    victory: {
      speaker: "Lumen Quill",
      role: "Scout",
      line: "The pines ahead are singing. Wisps. Brother Ash has a stall if you still have coin.",
    },
    asides: [
      "First blood on the Low Road.",
      "Hold the two bends.",
      "Runners. Aim first.",
      "Shells soak arrows. Mix a mortar.",
    ],
  },
  {
    id: "pine-cut",
    name: "Pine Cut",
    place: "The high switch",
    theme: {
      moss: "#1e2c24",
      lit: "#2f4a3c",
      bank: "#16241c",
      path: "#4a3c2c",
      pathLit: "#6a5640",
      ink: "#0e1612",
      water: "#1c3336",
      waterLit: "#2e4e4c",
    },
    water: [
      [12, 8],
      [11, 8],
      [0, 8],
    ],
    path: [
      { c: 0, r: 3 },
      { c: 4, r: 3 },
      { c: 4, r: 7 },
      { c: 1, r: 7 },
      { c: 1, r: 1 },
      { c: 8, r: 1 },
      { c: 8, r: 6 },
      { c: 12, r: 6 },
    ],
    props: [
      { c: 0, r: 0, kind: "pine" },
      { c: 0, r: 5, kind: "oak" },
      { c: 2, r: 5, kind: "rock" },
      { c: 3, r: 0, kind: "lamp" },
      { c: 6, r: 0, kind: "pine" },
      { c: 7, r: 3, kind: "stump" },
      { c: 6, r: 4, kind: "oak" },
      { c: 10, r: 2, kind: "rock" },
      { c: 11, r: 0, kind: "pine" },
      { c: 12, r: 0, kind: "pine" },
      { c: 9, r: 8, kind: "fence" },
    ],
    waves: [
      [
        { kind: "runner", count: 8, gap: 0.34, delay: 0 },
        { kind: "wisp", count: 5, gap: 0.4, delay: 1.6 },
      ],
      [
        { kind: "shell", count: 5, gap: 0.8, delay: 0 },
        { kind: "grub", count: 12, gap: 0.34, delay: 1 },
      ],
      [
        { kind: "wisp", count: 12, gap: 0.28, delay: 0 },
        { kind: "shaman", count: 2, gap: 1.2, delay: 2 },
      ],
      [
        { kind: "runner", count: 14, gap: 0.24, delay: 0 },
        { kind: "shell", count: 6, gap: 0.6, delay: 2 },
      ],
      [
        { kind: "shaman", count: 3, gap: 1, delay: 0 },
        { kind: "wisp", count: 10, gap: 0.26, delay: 1.4 },
        { kind: "grub", count: 10, gap: 0.28, delay: 3 },
      ],
    ],
    briefing: {
      speaker: "Lumen Quill",
      role: "Scout",
      line: "Pine Cut switches twice. Mortars go blind on the wisps. Spark the air or the keep starves.",
    },
    victory: {
      speaker: "Brother Ash",
      role: "Keep steward",
      line: "The Emberlord walks the last stair himself. Buy glass if the bends feel short. Buy salt if the cloaks keep singing.",
    },
    asides: [
      "The high switch. Runners and wisps together.",
      "Shells on the lower cut.",
      "Two shamans. Salt would have helped.",
      "Do not chase last. Aim first.",
      "The pack heals if you let it clump.",
      "Almost the stair. Spend the bounty.",
      "Last cut. Then the stall.",
    ],
  },
  {
    id: "keep-stair",
    name: "Keep Stair",
    place: "The last latch",
    theme: {
      moss: "#2a241c",
      lit: "#4a3a2c",
      bank: "#1c1812",
      path: "#5a4030",
      pathLit: "#7a5840",
      ink: "#160e0c",
      water: "#2a2420",
      waterLit: "#3a3028",
    },
    water: [],
    path: [
      { c: 0, r: 7 },
      { c: 3, r: 7 },
      { c: 3, r: 2 },
      { c: 7, r: 2 },
      { c: 7, r: 6 },
      { c: 11, r: 6 },
      { c: 11, r: 1 },
      { c: 12, r: 1 },
    ],
    props: [
      { c: 0, r: 0, kind: "pine" },
      { c: 1, r: 0, kind: "oak" },
      { c: 0, r: 1, kind: "lamp" },
      { c: 5, r: 0, kind: "rock" },
      { c: 8, r: 0, kind: "pine" },
      { c: 12, r: 0, kind: "pine" },
      { c: 0, r: 8, kind: "reed" },
      { c: 1, r: 8, kind: "cart" },
      { c: 5, r: 4, kind: "oak" },
      { c: 5, r: 5, kind: "stump" },
      { c: 8, r: 4, kind: "rock" },
      { c: 9, r: 8, kind: "fence" },
      { c: 12, r: 8, kind: "oak" },
      { c: 12, r: 4, kind: "lamp" },
      { c: 2, r: 4, kind: "shroom" },
    ],
    waves: [
      [
        { kind: "grub", count: 14, gap: 0.28, delay: 0 },
        { kind: "wisp", count: 8, gap: 0.3, delay: 2 },
      ],
      [
        { kind: "shell", count: 8, gap: 0.55, delay: 0 },
        { kind: "runner", count: 12, gap: 0.24, delay: 1.6 },
      ],
      [
        { kind: "shaman", count: 3, gap: 1, delay: 0 },
        { kind: "wisp", count: 12, gap: 0.24, delay: 1.5 },
      ],
      [
        { kind: "runner", count: 16, gap: 0.22, delay: 0 },
        { kind: "shell", count: 8, gap: 0.48, delay: 2 },
      ],
      [
        { kind: "wisp", count: 16, gap: 0.22, delay: 0 },
        { kind: "shaman", count: 3, gap: 0.9, delay: 2.5 },
      ],
      [
        { kind: "shell", count: 10, gap: 0.42, delay: 0 },
        { kind: "runner", count: 12, gap: 0.22, delay: 2 },
        { kind: "wisp", count: 10, gap: 0.24, delay: 3.5 },
      ],
      [
        { kind: "shaman", count: 4, gap: 0.8, delay: 0 },
        { kind: "shell", count: 8, gap: 0.45, delay: 2 },
        { kind: "wisp", count: 10, gap: 0.22, delay: 4 },
      ],
    ],
    briefing: {
      speaker: "Captain Sera Venn",
      role: "Watch-captain",
      line: "This is the latch. Hold the stair. If it holds, the ford still floods at dawn — we are not done.",
    },
    victory: {
      speaker: "Lumen Quill",
      role: "Scout",
      line: "The keep stands. The river is waking. Buy salt and glass. The ford does not forgive clumps.",
    },
    asides: [
      "The stair begins.",
      "They know the turns now.",
      "Cloaks on the rise.",
      "Do not sell the spark.",
      "The air is full of wisps.",
      "Hold the latch. Then the water.",
    ],
  },
  {
    id: "river-ford",
    name: "River Ford",
    place: "Dawn water",
    theme: {
      moss: "#1c2a24",
      lit: "#2a4038",
      bank: "#15201c",
      path: "#5a4a32",
      pathLit: "#7a6240",
      ink: "#0c1412",
      water: "#1a3a40",
      waterLit: "#2e5a58",
    },
    water: [
      [0, 0],
      [1, 0],
      [0, 1],
      [5, 4],
      [5, 5],
      [6, 4],
      [6, 5],
      [11, 7],
      [12, 7],
      [12, 8],
      [11, 8],
      [0, 8],
      [1, 8],
    ],
    path: [
      { c: 0, r: 4 },
      { c: 3, r: 4 },
      { c: 3, r: 1 },
      { c: 8, r: 1 },
      { c: 8, r: 7 },
      { c: 4, r: 7 },
      { c: 4, r: 3 },
      { c: 10, r: 3 },
      { c: 10, r: 6 },
      { c: 12, r: 6 },
    ],
    props: [
      { c: 2, r: 0, kind: "reed" },
      { c: 3, r: 0, kind: "lamp" },
      { c: 7, r: 0, kind: "pine" },
      { c: 9, r: 0, kind: "rock" },
      { c: 12, r: 0, kind: "pine" },
      { c: 2, r: 8, kind: "cart" },
      { c: 7, r: 5, kind: "stump" },
      { c: 9, r: 5, kind: "lamp" },
      { c: 12, r: 4, kind: "oak" },
    ],
    waves: [
      [
        { kind: "runner", count: 10, gap: 0.3, delay: 0 },
        { kind: "wisp", count: 6, gap: 0.34, delay: 1.6 },
      ],
      [
        { kind: "shell", count: 6, gap: 0.7, delay: 0 },
        { kind: "grub", count: 10, gap: 0.32, delay: 1 },
      ],
      [
        { kind: "wisp", count: 14, gap: 0.24, delay: 0 },
        { kind: "shaman", count: 2, gap: 1.1, delay: 2 },
      ],
      [
        { kind: "runner", count: 12, gap: 0.22, delay: 0 },
        { kind: "shell", count: 6, gap: 0.5, delay: 2 },
        { kind: "shaman", count: 2, gap: 1, delay: 3.5 },
      ],
      [
        { kind: "wisp", count: 10, gap: 0.22, delay: 0 },
        { kind: "shell", count: 6, gap: 0.48, delay: 1.4 },
        { kind: "lord", count: 1, gap: 1, delay: 3.8 },
        { kind: "shaman", count: 2, gap: 1, delay: 5.5 },
      ],
    ],
    briefing: {
      speaker: "Brother Ash",
      role: "Keep steward",
      line: "The ford is all water and spite. Grass is scarce. Line the dry banks. He walks last, wet to the knees.",
    },
    victory: {
      speaker: "Captain Sera Venn",
      role: "Watch-captain",
      line: "Dawn on the water. Emberford keeps the watch. Take the relics and walk it again if the night still itches.",
    },
    asides: [
      "The water takes tiles. Plant on dirt.",
      "Wisps over the channel.",
      "Two cloaks. Salt if you bought it.",
      "The banks are the whole trick.",
      "The Emberlord in the wet. Burn the ford.",
    ],
  },
];

export const BESTIARY = [
  { kind: "grub" as const, weak: "Anything. Bows on the bends are enough." },
  { kind: "runner" as const, weak: "Aim First. Frost if they slip the line." },
  { kind: "shell" as const, weak: "Mortar and Bramble. Arrows tickle the plate." },
  { kind: "wisp" as const, weak: "Bow and Spark only. Mortar and Thorn go blind." },
  { kind: "shaman" as const, weak: "Kill first. Salt cuts the song. Spark the clump." },
  { kind: "hound" as const, weak: "Frost and Ward. Aim First. They slip bows if you nap." },
  { kind: "lord" as const, weak: "Burn the road. Mix splash, spark, and time." },
];

export function describePlan(waves: WaveSpawn[][], index: number): string {
  const plan = waves[index];
  if (!plan) return "—";
  return plan.map((p) => `${p.count} ${CREEPS[p.kind].name}`).join(" · ");
}

export function pathCellsOf(path: ReadonlyArray<{ c: number; r: number }>): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
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

