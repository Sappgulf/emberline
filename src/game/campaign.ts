import { CREEPS, type CreepKind, type PropKind, type WaveSpawn } from "./config.ts";

export type RelicId = "purse" | "timber" | "whet" | "oil" | "cold" | "glass" | "salt" | "ember" | "adze" | "cord" | "flint";

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

export type MapAmbient = "lanterns" | "pine-fog" | "keep-ash" | "river-rain" | "emberfall";
export type MapMarker = "gate" | "pine" | "keep" | "rock";
export type FieldRuleId = "lantern-aura" | "pine-fog" | "stone-latch" | "ford-banks" | "emberfall";

export interface FieldRule {
  id: FieldRuleId;
  label: string;
  detail: string;
  objectiveTitle: string;
  objectiveDetail: string;
  target: number;
  reward: number;
}

export interface MapProfile {
  label: string;
  detail: string;
  ambient: MapAmbient;
  marker: MapMarker;
  rule: FieldRule;
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
  profile: MapProfile;
}

export const SHOP: ShopItem[] = [
  { id: "purse", name: "Copper purse", cost: 80, blurb: "+50 gold at the start of every map." },
  { id: "timber", name: "Spare timber", cost: 70, blurb: "+2 keep lives on every map." },
  { id: "whet", name: "Whetstone", cost: 100, blurb: "All towers deal 12% more damage." },
  { id: "oil", name: "Horn oil", cost: 60, blurb: "Horn cools in 10s instead of 14. Moves cost 10g." },
  { id: "cold", name: "Cold iron", cost: 90, blurb: "Frost chill lasts longer and holds harder. Not extra damage." },
  { id: "glass", name: "Scout glass", cost: 85, blurb: "Every tower sees 12% farther." },
  { id: "salt", name: "Witch salt", cost: 75, blurb: "Shamans heal half as much." },
  { id: "ember", name: "Ember flask", cost: 95, blurb: "Mortars and oil hit 20% harder." },
  { id: "adze", name: "Keep adze", cost: 70, blurb: "Tower upgrades cost 18% less." },
  { id: "cord", name: "Watch cord", cost: 80, blurb: "Lined towers hit 15% per neighbor instead of 10%." },
  { id: "flint", name: "Gate flint", cost: 70, blurb: "Each tower's first shot of a wave hits 40% harder." },
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
  cord: 1,
  flint: 2,
};

export const RELIC_IDS = SHOP.map((s) => s.id);

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
    profile: {
      label: "Lantern bends",
      detail: "Two warm turns. Keep the line close.",
      ambient: "lanterns",
      marker: "gate",
      rule: {
        id: "lantern-aura",
        label: "Lantern aura",
        detail: "Towers within a lantern's glow fire faster.",
        objectiveTitle: "Light the bends",
        objectiveDetail: "Build one tower within a lantern's glow.",
        target: 1,
        reward: 35,
      },
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
      [
        { kind: "hound", count: 6, gap: 0.3, delay: 0 },
        { kind: "runner", count: 8, gap: 0.28, delay: 1.6 },
      ],
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
      "Hounds on the last bend. Frost if you have it.",
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
    profile: {
      label: "High pine switch",
      detail: "Cold air over the cut. Watch the sky.",
      ambient: "pine-fog",
      marker: "pine",
      rule: {
        id: "pine-fog",
        label: "Pine fog",
        detail: "Spark cuts through the fog; other towers lose a little reach.",
        objectiveTitle: "Break the fog",
        objectiveDetail: "Clear three Wisps before the map ends.",
        target: 3,
        reward: 45,
      },
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
      { c: 5, r: 8, kind: "lamp" },
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
      [
        { kind: "wisp", count: 10, gap: 0.24, delay: 0 },
        { kind: "hound", count: 8, gap: 0.26, delay: 1.8 },
        { kind: "shell", count: 4, gap: 0.55, delay: 3.2 },
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
      line: "The stair is next. Buy glass if the bends feel short. Buy salt — the cloaks keep singing, but he does not walk yet.",
    },
    asides: [
      "The high switch. Runners and wisps together.",
      "Shells on the lower cut.",
      "Two shamans. Salt would have helped.",
      "Do not chase last. Aim first.",
      "The pack heals if you let it clump.",
      "Air and hounds together. Keep the spark.",
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
    profile: {
      label: "Stone latch",
      detail: "Tight stair. The last turn comes fast.",
      ambient: "keep-ash",
      marker: "keep",
      rule: {
        id: "stone-latch",
        label: "Stone latch",
        detail: "Towers beside the road strike harder.",
        objectiveTitle: "Link the latch",
        objectiveDetail: "Build two towers beside the road so their line overlaps.",
        target: 2,
        reward: 50,
      },
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
      { c: 9, r: 3, kind: "lamp" },
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
      "Last rise. Spend what you have.",
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
    profile: {
      label: "Wet banks",
      detail: "Water drags the ground road.",
      ambient: "river-rain",
      marker: "rock",
      rule: {
        id: "ford-banks",
        label: "Ford banks",
        detail: "Water drags ground creeps; Wisps ignore the current.",
        objectiveTitle: "Hold dry",
        objectiveDetail: "Clear one wave without a breach.",
        target: 1,
        reward: 55,
      },
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
      line: "The ford is water and spite. Grass is scarce. Wet banks drag the pack. He walks last, wet to the knees — three lives if he reaches the keep.",
    },
    victory: {
      speaker: "Captain Sera Venn",
      role: "Watch-captain",
      line: "The ford holds. The copse still burns. One more latch — then dawn.",
    },
    asides: [
      "The water takes tiles. Banks drag the pack.",
      "Wisps over the channel.",
      "Two cloaks. Salt if you bought it.",
      "The banks are the whole trick.",
      "The Emberlord in the wet. Burn the ford.",
    ],
  },
  {
    id: "ember-copse",
    name: "Ember Copse",
    place: "The last fire",
    theme: {
      moss: "#241c16",
      lit: "#4a3020",
      bank: "#1a1410",
      path: "#6a4028",
      pathLit: "#8a5834",
      ink: "#120c0a",
      water: "#2a2018",
      waterLit: "#3a2c20",
    },
    profile: {
      label: "Last fire",
      detail: "Ash in the air. Burn the road bright.",
      ambient: "emberfall",
      marker: "keep",
      rule: {
        id: "emberfall",
        label: "Emberfall",
        detail: "Crowned towers scorch the last fire for extra damage.",
        objectiveTitle: "Crown the line",
        objectiveDetail: "Reach Crowned with at least one tower.",
        target: 1,
        reward: 65,
      },
    },
    water: [
      [0, 0],
      [1, 0],
      [0, 1],
      [12, 8],
      [11, 8],
    ],
    path: [
      { c: 0, r: 6 },
      { c: 3, r: 6 },
      { c: 3, r: 1 },
      { c: 7, r: 1 },
      { c: 7, r: 7 },
      { c: 10, r: 7 },
      { c: 10, r: 2 },
      { c: 12, r: 2 },
    ],
    props: [
      { c: 0, r: 8, kind: "pine" },
      { c: 1, r: 8, kind: "oak" },
      { c: 5, r: 0, kind: "pine" },
      { c: 6, r: 4, kind: "rock" },
      { c: 8, r: 3, kind: "stump" },
      { c: 12, r: 0, kind: "pine" },
      { c: 4, r: 5, kind: "lamp" },
      { c: 9, r: 0, kind: "oak" },
      { c: 11, r: 5, kind: "shroom" },
      { c: 1, r: 3, kind: "fence" },
    ],
    waves: [
      [
        { kind: "runner", count: 10, gap: 0.26, delay: 0 },
        { kind: "wisp", count: 8, gap: 0.28, delay: 1.4 },
      ],
      [
        { kind: "shell", count: 7, gap: 0.5, delay: 0 },
        { kind: "shaman", count: 2, gap: 1, delay: 2 },
      ],
      [
        { kind: "hound", count: 10, gap: 0.24, delay: 0 },
        { kind: "wisp", count: 10, gap: 0.22, delay: 1.8 },
      ],
      [
        { kind: "runner", count: 12, gap: 0.22, delay: 0 },
        { kind: "shell", count: 8, gap: 0.42, delay: 2 },
        { kind: "shaman", count: 3, gap: 0.9, delay: 3.5 },
      ],
      [
        { kind: "wisp", count: 14, gap: 0.2, delay: 0 },
        { kind: "hound", count: 8, gap: 0.24, delay: 2 },
        { kind: "lord", count: 1, gap: 1, delay: 4.2 },
        { kind: "shaman", count: 2, gap: 1, delay: 6 },
        { kind: "grub", count: 12, gap: 0.22, delay: 7 },
      ],
    ],
    briefing: {
      speaker: "Lumen Quill",
      role: "Scout",
      line: "The ford was not the end. The true fire is here. Line the bends. Spark the air. Salt the cloaks or he walks in fat.",
    },
    victory: {
      speaker: "Captain Sera Venn",
      role: "Watch-captain",
      line: "Dawn. Emberford keeps the watch. Take the relics and walk it again if the night still itches.",
    },
    asides: [
      "The last fire. Air first.",
      "Plate and cloaks.",
      "Hounds in the copse.",
      "Do not sell the line.",
      "He walks. Burn the road.",
    ],
  },
];

export const BESTIARY = [
  { kind: "grub" as const, weak: "Anything. Bows on the bends are enough. A leak costs one life." },
  { kind: "runner" as const, weak: "Aim First. Frost and Bramble catch them. A leak costs one life." },
  { kind: "shell" as const, weak: "Mortar and Bramble. Arrows tickle plate. A leak costs two lives." },
  { kind: "wisp" as const, weak: "Longbow and Spark only. Mortar and Bramble go blind. A leak costs one life." },
  { kind: "shaman" as const, weak: "Kill first. Salt halves the song. Spark the clump. A leak costs two lives." },
  { kind: "hound" as const, weak: "Frost and Ash Ward. Aim First. A leak costs one life." },
  { kind: "lord" as const, weak: "Burn the road. Mix mortar, spark, and time. A leak costs three lives." },
];

export function describePlan(waves: WaveSpawn[][], index: number): string {
  const plan = waves[index];
  if (!plan) return "—";
  return plan.map((p) => `${p.count} ${CREEPS[p.kind].name}`).join(" · ");
}

export function planHasAir(waves: WaveSpawn[][], index: number): boolean {
  const plan = waves[index];
  if (!plan) return false;
  return plan.some((p) => CREEPS[p.kind].flying);
}

export function leakCost(kind: CreepKind): number {
  if (kind === "lord") return 3;
  if (kind === "shaman" || kind === "shell") return 2;
  return 1;
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
