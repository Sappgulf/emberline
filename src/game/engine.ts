import {
  COLS,
  CREEPS,
  FORM_NAME,
  towerForm,
  MAX_UPGRADE,
  REFUND_RATE,
  ROWS,
  START_GOLD,
  START_LIVES,
  TICK,
  HORN_CD,
  HORN_COST,
  MEND_COST,
  TOWERS,
  damageAt,
  rangeAt,
  rateAt,
  upgradeDamageCost,
  upgradeRateCost,
  type Aim,
  type CreepKind,
  type TowerKind,
} from "./config.ts";
import { MAPS, RELIC_IDS, describePlan, leakCost, pathCellsOf, planHasAir, shopFor, type MapDef, type RelicId } from "./campaign.ts";
import { sfx, setMuted } from "./audio.ts";

const FIRST = MAPS[0];

function blockedCellsFrom(map: MapDef) {
  const set = new Set(map.props.map((p) => `${p.c},${p.r}`));
  for (const [c, r] of map.water) set.add(`${c},${r}`);
  return set;
}
export type Phase = "title" | "brief" | "ready" | "wave" | "shop" | "stall" | "won" | "lost";

export interface Tower {
  id: number;
  kind: TowerKind;
  c: number;
  r: number;
  dmgLvl: number;
  rateLvl: number;
  cooldown: number;
  angle: number;
  visAngle: number;
  recoil: number;
  build: number;
  spent: number;
  aim: Aim;
  empowered: boolean;
  volley: boolean;
}

export interface Creep {
  id: number;
  kind: CreepKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  wp: number;
  slowT: number;
  alive: boolean;
  progress: number;
  facing: number;
  flash: number;
  spawn: number;
  death: number;
  squash: number;
  healT: number;
  rootT: number;
}

export interface Beam {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  max: number;
  color: string;
}

export interface Shot {
  id: number;
  kind: TowerKind;
  x: number;
  y: number;
  px: number;
  py: number;
  tx: number;
  ty: number;
  targetId: number;
  speed: number;
  damage: number;
  splash: number;
  slow: number;
  ttl: number;
  angle: number;
  pierce: number;
  hit: Set<number>;
  form: number;
  ox: number;
  oy: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: "spark" | "smoke" | "ember" | "ring" | "mote";
  rot: number;
}

export interface Floater {
  x: number;
  y: number;
  text: string;
  life: number;
  max: number;
  color: string;
}

export interface HudSnap {
  gold: number;
  lives: number;
  wave: number;
  totalWaves: number;
  phase: Phase;
  selectedKind: TowerKind | null;
  selectedTower: Tower | null;
  formName: string;
  remaining: number;
  nextCosts: { dmg: number; rate: number } | null;
  aim: Aim;
  paused: boolean;
  speed: number;
  nextWave: string;
  streak: number;
  hornCd: number;
  hornCost: number;
  mendCost: number;
  mapName: string;
  mapIndex: number;
  mapTotal: number;
  relics: RelicId[];
  story: { speaker: string; role: string; line: string } | null;
  shopItems: ReturnType<typeof shopFor>;
  moving: boolean;
  moveCost: number;
  maxLives: number;
  towerCount: number;
  lineBonus: number;
  unlocked: number;
  hero: { who: string; line: string; kind: "horn" | "mend" | "gold" } | null;
  grade: string | null;
  towerAim: Aim;
  codex: boolean;
  canUndo: boolean;
  nextAir: boolean;
  airCovered: boolean;
  sellRefund: number;
  muted: boolean;
}

export interface Burn {
  x: number;
  y: number;
  r: number;
  life: number;
  tick: number;
}

export interface Banner {
  text: string;
  life: number;
  max: number;
}

export class EmberEngine {
  gold = START_GOLD;
  lives = START_LIVES;
  wave = 0;
  phase: Phase = "title";
  mapIndex = 0;
  map: MapDef = FIRST;
  path = FIRST.path;
  props = FIRST.props;
  pathSet = pathCellsOf(FIRST.path);
  blockedSet = blockedCellsFrom(FIRST);
  waterSet = new Set(FIRST.water.map(([c, r]) => `${c},${r}`));
  relics = new Set<RelicId>();
  unlocked = 0;
  hero: HudSnap["hero"] = null;
  heroT = 0;
  farmT = 0;
  focusId = -1;
  grade: string | null = null;
  codex = false;
  towers: Tower[] = [];
  creeps: Creep[] = [];
  shots: Shot[] = [];
  beams: Beam[] = [];
  burns: Burn[] = [];
  particles: Particle[] = [];
  floaters: Floater[] = [];
  selectedKind: TowerKind | null = "bow";
  selectedId: number | null = null;
  movingId: number | null = null;
  hoverC = -1;
  hoverR = -1;
  trauma = 0;
  time = 0;
  hitstop = 0;
  aim: Aim = "first";
  paused = false;
  speed = 1;
  streak = 0;
  streakT = 0;
  hornCd = 0;
  banner: Banner | null = null;
  spawnQ: { t: number; kind: CreepKind }[] = [];
  nextId = 1;
  reducedMotion = false;
  lastPlaceId = -1;
  lastPlaceT = -99;
  muted = false;
  autoPaused = false;

  private acc = 0;
  private listeners = new Set<() => void>();
  private snap: HudSnap = this.buildHud();
  private hudKey = "";
  private moteAcc = 0;

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify() {
    this.snap = this.buildHud();
    for (const fn of this.listeners) {
      try {
        fn();
      } catch (err) {
        console.error("emberline hud", err);
      }
    }
  }

  readSave() {
    try {
      const raw = localStorage.getItem("emberline-watch");
      if (!raw) return;
      const data = JSON.parse(raw) as { relics?: RelicId[]; unlocked?: number; muted?: boolean };
      this.unlocked = Math.max(0, Math.min(MAPS.length, data.unlocked ?? 0));
      const known = new Set<string>(RELIC_IDS);
      for (const id of data.relics ?? []) {
        if (known.has(id)) this.relics.add(id);
      }
      if (data.muted) {
        this.muted = true;
        setMuted(true);
      }
    } catch {
      /* ignore */
    }
  }

  persist() {
    try {
      localStorage.setItem(
        "emberline-watch",
        JSON.stringify({ relics: [...this.relics], unlocked: this.unlocked, muted: this.muted }),
      );
    } catch {
      /* ignore */
    }
  }

  lineBonus(tower: Tower) {
    let n = 0;
    for (const other of this.towers) {
      if (other.id === tower.id) continue;
      if (Math.abs(other.c - tower.c) + Math.abs(other.r - tower.r) === 1) n += 1;
    }
    return 1 + n * (this.relics.has("cord") ? 0.15 : 0.1);
  }

  hud(): HudSnap {
    return this.snap;
  }

  buildHud(): HudSnap {
    const t = this.selectedTower();
    const upcoming = this.phase === "wave" ? Math.max(0, this.wave - 1) : this.wave;
    const map = this.map;
    return {
      gold: this.gold,
      lives: this.lives,
      wave: this.wave,
      totalWaves: map.waves.length,
      phase: this.phase,
      selectedKind: this.selectedKind,
      selectedTower: t,
      formName: t ? FORM_NAME[towerForm(t.dmgLvl, t.rateLvl)] : "",
      remaining: this.creeps.filter((c) => c.alive).length + this.spawnQ.length,
      nextCosts: t
        ? {
            dmg: t.dmgLvl >= MAX_UPGRADE ? 0 : this.upgradePrice(upgradeDamageCost(t.kind, t.dmgLvl + 1)),
            rate: t.rateLvl >= MAX_UPGRADE ? 0 : this.upgradePrice(upgradeRateCost(t.kind, t.rateLvl + 1)),
          }
        : null,
      aim: this.aim,
      paused: this.paused,
      speed: this.speed,
      nextWave: describePlan(map.waves, Math.min(upcoming, map.waves.length - 1)),
      streak: this.streak,
      hornCd: this.hornCd,
      hornCost:
        this.heroT > 0 && this.hero?.kind === "horn" ? 0 : this.lives <= 5 ? Math.max(20, Math.floor(HORN_COST * 0.65)) : HORN_COST,
      mendCost: this.heroT > 0 && this.hero?.kind === "mend" ? 30 : MEND_COST,
      mapName: map.name,
      mapIndex: this.mapIndex,
      mapTotal: MAPS.length,
      relics: [...this.relics],
      story: this.phase === "brief" ? map.briefing : this.phase === "shop" ? map.victory : null,
      shopItems: shopFor(this.mapIndex, this.wave),
      moving: this.movingId != null,
      moveCost: this.moveCost(),
      maxLives: this.maxLives(),
      towerCount: this.towers.length,
      lineBonus: t ? this.lineBonus(t) : 1,
      unlocked: this.unlocked,
      hero: this.heroT > 0 ? this.hero : null,
      grade: this.grade,
      towerAim: t?.aim ?? this.aim,
      codex: this.codex,
      canUndo: this.canUndo(),
      nextAir: planHasAir(map.waves, Math.min(upcoming, map.waves.length - 1)),
      airCovered: this.towers.some((tw) => TOWERS[tw.kind].hitsAir),
      sellRefund: t ? this.refundFor(t) : 0,
      muted: this.muted,
    };
  }

  toggleMute() {
    this.muted = !this.muted;
    setMuted(this.muted);
    this.persist();
    this.notify();
  }

  hideTab(hidden: boolean) {
    if (hidden) {
      if (this.playing() && !this.paused) {
        this.paused = true;
        this.autoPaused = true;
        this.notify();
      }
      return;
    }
    if (this.autoPaused) {
      this.paused = false;
      this.autoPaused = false;
      this.notify();
    }
  }

  canUndo() {
    if (!this.playing()) return false;
    if (this.time - this.lastPlaceT > 3.2) return false;
    const t = this.towers.find((x) => x.id === this.lastPlaceId);
    return !!t && t.dmgLvl === 1 && t.rateLvl === 1 && !t.empowered;
  }

  refundFor(t: Tower) {
    const rate = t.dmgLvl === 1 && t.rateLvl === 1 && !t.empowered ? 0.7 : REFUND_RATE;
    return Math.floor(t.spent * rate);
  }

  undoLast() {
    if (!this.canUndo()) {
      sfx.deny();
      return;
    }
    const t = this.towers.find((x) => x.id === this.lastPlaceId);
    if (!t) return;
    this.gold += t.spent;
    this.towers = this.towers.filter((x) => x.id !== t.id);
    this.selectedId = this.towers.at(-1)?.id ?? null;
    this.lastPlaceId = -1;
    this.float(t.c + 0.5, t.r + 0.5, "Taken back", "#d4a054");
    this.burst(t.c + 0.5, t.r + 0.5, "#b7ab90", 8, "smoke");
    sfx.place();
    this.notify();
  }

  selectedTower(): Tower | null {
    return this.towers.find((t) => t.id === this.selectedId) ?? null;
  }

  setAim(aim: Aim) {
    const t = this.selectedTower();
    if (t) t.aim = aim;
    this.aim = aim;
    this.notify();
  }

  toggleCodex() {
    this.codex = !this.codex;
    this.notify();
  }

  togglePause() {
    if (this.phase !== "ready" && this.phase !== "wave") return;
    this.paused = !this.paused;
    this.notify();
  }

  cycleSpeed() {
    this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1;
    this.notify();
  }

  playing() {
    return this.phase === "ready" || this.phase === "wave";
  }

  blowHorn() {
    if (!this.playing()) return;
    const free = this.heroT > 0 && this.hero?.kind === "horn";
    const cost = free ? 0 : this.lives <= 5 ? Math.max(20, Math.floor(HORN_COST * 0.65)) : HORN_COST;
    if (this.hornCd > 0 || this.gold < cost) {
      sfx.deny();
      return;
    }
    this.gold -= cost;
    this.hornCd = this.relics.has("oil") ? 10 : HORN_CD;
    for (const c of this.creeps) {
      if (!c.alive) continue;
      c.slowT = Math.max(c.slowT, 2.4);
      this.damageCreep(c, 16, 0, true);
    }
    for (const p of this.path) {
      this.burns.push({
        x: p.c + 0.5,
        y: p.r + 0.5,
        r: 0.5,
        life: this.relics.has("oil") ? 2.8 : 1.8,
        tick: 0.2,
      });
    }
    this.trauma = Math.min(1, this.trauma + 0.22);
    this.float(COLS / 2, 0.5, "Horn!", "#d4a054");
    this.banner = { text: "Horn — the road burns", life: 1.1, max: 1.1 };
    sfx.horn();
    this.notify();
  }

  mendKeep() {
    if (!this.playing()) {
      sfx.deny();
      return;
    }
    const cost = this.heroT > 0 && this.hero?.kind === "mend" ? 30 : MEND_COST;
    if (this.lives >= this.maxLives() || this.gold < cost) {
      sfx.deny();
      return;
    }
    this.gold -= cost;
    this.lives = Math.min(this.maxLives(), this.lives + (this.lives <= 5 ? 4 : 3));
    for (const c of this.creeps) {
      if (!c.alive || CREEPS[c.kind].flying) continue;
      c.slowT = Math.max(c.slowT, 0.9);
    }
    const keep = this.path[this.path.length - 1];
    this.ring(keep.c + 0.5, keep.r + 0.5, "#d4a054");
    this.banner = { text: "Mended — the road drags", life: 1.2, max: 1.2 };
    sfx.place();
    this.notify();
  }

  maxLives() {
    return START_LIVES + (this.relics.has("timber") ? 2 : 0);
  }

  startGold() {
    return START_GOLD + (this.relics.has("purse") ? 50 : 0);
  }

  loadMap(index: number) {
    const safe = Math.max(0, Math.min(MAPS.length - 1, index | 0));
    this.mapIndex = safe;
    this.map = MAPS[safe];
    this.path = this.map.path;
    this.props = this.map.props;
    this.pathSet = pathCellsOf(this.path);
    this.blockedSet = blockedCellsFrom(this.map);
    this.waterSet = new Set(this.map.water.map(([c, r]) => `${c},${r}`));
  }

  fordSlow(x: number, y: number) {
    if (this.waterSet.size === 0) return 1;
    const c = Math.floor(x);
    const r = Math.floor(y);
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (this.waterSet.has(`${c + dc},${r + dr}`)) return 0.72;
      }
    }
    return 1;
  }

  clearField() {
    this.wave = 0;
    this.towers = [];
    this.creeps = [];
    this.shots = [];
    this.beams = [];
    this.burns = [];
    this.particles = [];
    this.floaters = [];
    this.selectedKind = "bow";
    this.selectedId = null;
    this.movingId = null;
    this.trauma = 0;
    this.time = 0;
    this.hitstop = 0;
    this.paused = false;
    this.speed = 1;
    this.streak = 0;
    this.streakT = 0;
    this.hornCd = 0;
    this.banner = null;
    this.spawnQ = [];
    this.nextId = 1;
    this.lastPlaceId = -1;
    this.lastPlaceT = -99;
    this.acc = 0;
    this.hero = null;
    this.heroT = 0;
    this.codex = false;
    this.autoPaused = false;
  }

  reset() {
    this.relics = new Set();
    this.loadMap(0);
    this.clearField();
    this.gold = this.startGold();
    this.lives = this.maxLives();
    this.phase = "brief";
    this.persist();
    this.notify();
  }

  startFromTitle() {
    this.reset();
  }

  continueWatch() {
    this.readSave();
    const idx = Math.min(this.unlocked, MAPS.length - 1);
    this.loadMap(idx);
    this.clearField();
    this.gold = this.startGold() + (idx > 0 ? 40 : 0);
    this.lives = this.maxLives();
    this.phase = "brief";
    this.notify();
  }

  keepRelics() {
    this.loadMap(0);
    this.clearField();
    this.gold = this.startGold();
    this.lives = this.maxLives();
    this.phase = "brief";
    this.persist();
    this.notify();
  }

  dismissBrief() {
    if (this.phase !== "brief") return;
    this.clearField();
    this.gold = this.startGold() + (this.mapIndex > 0 ? 40 : 0);
    this.lives = this.maxLives();
    this.phase = "ready";
    this.notify();
  }

  buyRelic(id: RelicId) {
    if (this.phase !== "shop" && this.phase !== "stall") return;
    if (this.relics.has(id)) {
      sfx.deny();
      return;
    }
    const item = shopFor(this.mapIndex, this.wave).find((s) => s.id === id);
    if (!item || this.gold < item.cost) {
      sfx.deny();
      return;
    }
    this.gold -= item.cost;
    this.relics.add(id);
    this.persist();
    sfx.place();
    this.notify();
  }

  openStall() {
    if (this.phase !== "ready" || this.wave < 1) {
      sfx.deny();
      return;
    }
    this.phase = "stall";
    this.notify();
  }

  closeStall() {
    if (this.phase !== "stall") return;
    this.phase = "ready";
    this.notify();
  }

  leaveShop() {
    if (this.phase !== "shop") return;
    if (this.mapIndex >= MAPS.length - 1) {
      this.phase = "won";
      this.unlocked = Math.max(this.unlocked, MAPS.length);
      this.persist();
      sfx.win();
      this.notify();
      return;
    }
    this.loadMap(this.mapIndex + 1);
    this.phase = "brief";
    this.notify();
  }

  retryMap() {
    this.clearField();
    this.gold = this.startGold() + (this.mapIndex > 0 ? 40 : 0);
    this.lives = this.maxLives();
    this.phase = "brief";
    this.notify();
  }

  cellKey(c: number, r: number) {
    return `${c},${r}`;
  }

  occupied(c: number, r: number) {
    return this.towers.some((t) => t.c === c && t.r === r);
  }

  blocked(c: number, r: number) {
    return this.blockedSet.has(this.cellKey(c, r));
  }

  canBuild(c: number, r: number) {
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return false;
    if (this.pathSet.has(this.cellKey(c, r))) return false;
    if (this.blocked(c, r)) return false;
    if (this.occupied(c, r)) return false;
    return true;
  }

  chooseKind(kind: TowerKind | null) {
    this.selectedKind = this.selectedKind === kind ? null : kind;
    this.movingId = null;
    this.notify();
  }

  moveCost() {
    return this.relics.has("oil") ? 10 : 15;
  }

  upgradePrice(cost: number) {
    return Math.max(8, Math.floor(cost * (this.relics.has("adze") ? 0.82 : 1)));
  }

  empowerSelected() {
    if (!this.playing()) return;
    const t = this.selectedTower();
    if (!t || t.empowered || towerForm(t.dmgLvl, t.rateLvl) < 4) {
      sfx.deny();
      return;
    }
    if (this.gold < 70) {
      sfx.deny();
      return;
    }
    this.gold -= 70;
    t.empowered = true;
    t.spent += 70;
    t.build = 0.5;
    this.burst(t.c + 0.5, t.r + 0.3, "#e07838", 16, "ember");
    this.float(t.c + 0.5, t.r - 0.2, "Emberlit", "#e07838");
    sfx.place();
    this.notify();
  }

  armMove() {
    if (!this.playing()) return;
    const t = this.selectedTower();
    if (!t) {
      sfx.deny();
      return;
    }
    this.movingId = t.id;
    this.selectedKind = null;
    this.notify();
  }

  inspectLast() {
    if (!this.towers.length) {
      sfx.deny();
      return;
    }
    const i = this.towers.findIndex((t) => t.id === this.selectedId);
    const next = this.towers[(i + 1) % this.towers.length];
    this.selectedId = next.id;
    this.selectedKind = null;
    this.notify();
  }

  tapCell(c: number, r: number) {
    if (!this.playing()) return;
    const existing = this.towers.find((t) => t.c === c && t.r === r);
    if (this.movingId != null) {
      const mover = this.towers.find((t) => t.id === this.movingId);
      if (!mover) {
        this.movingId = null;
        this.notify();
        return;
      }
      if (existing && existing.id === mover.id) {
        this.movingId = null;
        this.notify();
        return;
      }
      if (!this.canBuild(c, r)) {
        sfx.deny();
        return;
      }
      const cost = this.moveCost();
      if (this.gold < cost) {
        sfx.deny();
        return;
      }
      this.gold -= cost;
      mover.c = c;
      mover.r = r;
      this.movingId = null;
      this.selectedId = mover.id;
      this.burst(c + 0.5, r + 0.5, "#d4a054", 10, "spark");
      this.float(c + 0.5, r + 0.1, "Moved", "#d4a054");
      sfx.place();
      this.notify();
      return;
    }
    if (existing) {
      this.selectedId = existing.id;
      this.selectedKind = null;
      this.notify();
      return;
    }
    if (!this.selectedKind) return;
    if (!this.canBuild(c, r)) {
      sfx.deny();
      return;
    }
    const def = TOWERS[this.selectedKind];
    if (this.gold < def.cost) {
      sfx.deny();
      return;
    }
    this.gold -= def.cost;
    const tower: Tower = {
      id: this.nextId++,
      kind: this.selectedKind,
      c,
      r,
      dmgLvl: 1,
      rateLvl: 1,
      cooldown: 0.15,
      angle: -Math.PI / 2,
      visAngle: -Math.PI / 2,
      recoil: 0,
      build: 1,
      spent: def.cost,
      aim: this.aim,
      empowered: false,
      volley: false,
    };
    this.towers.push(tower);
    this.selectedId = tower.id;
    this.lastPlaceId = tower.id;
    this.lastPlaceT = this.time;
    sfx.place();
    this.burst(c + 0.5, r + 0.5, "#d4a054", 4, "spark");
    if (this.lineBonus(tower) > 1) this.float(c + 0.5, r + 0.15, "Lined", "#d4a054");
    this.notify();
  }

  upgradeDamage() {
    if (!this.playing()) return;
    const t = this.selectedTower();
    if (!t || t.dmgLvl >= MAX_UPGRADE) return;
    const cost = this.upgradePrice(upgradeDamageCost(t.kind, t.dmgLvl + 1));
    if (this.gold < cost) {
      sfx.deny();
      return;
    }
    this.gold -= cost;
    this.lastPlaceId = -1;
    t.dmgLvl += 1;
    t.spent += cost;
    t.build = 0.55;
    this.burst(t.c + 0.5, t.r + 0.35, "#e07838", 10, "spark");
    if (towerForm(t.dmgLvl, t.rateLvl) >= 4) this.float(t.c + 0.5, t.r - 0.2, "Crowned", "#e07838");
    sfx.place();
    this.notify();
  }

  upgradeRate() {
    if (!this.playing()) return;
    const t = this.selectedTower();
    if (!t || t.rateLvl >= MAX_UPGRADE) return;
    const cost = this.upgradePrice(upgradeRateCost(t.kind, t.rateLvl + 1));
    if (this.gold < cost) {
      sfx.deny();
      return;
    }
    this.gold -= cost;
    this.lastPlaceId = -1;
    t.rateLvl += 1;
    t.spent += cost;
    t.build = 0.55;
    this.burst(t.c + 0.5, t.r + 0.35, "#d4a054", 10, "spark");
    if (towerForm(t.dmgLvl, t.rateLvl) >= 4) this.float(t.c + 0.5, t.r - 0.2, "Crowned", "#e07838");
    sfx.place();
    this.notify();
  }

  sellSelected() {
    if (!this.playing()) return;
    const t = this.selectedTower();
    if (!t) return;
    const refund = this.refundFor(t);
    this.gold += refund;
    this.towers = this.towers.filter((x) => x.id !== t.id);
    this.selectedId = null;
    if (t.id === this.lastPlaceId) this.lastPlaceId = -1;
    this.float(t.c + 0.5, t.r + 0.5, `+${refund}`, "#d4a054");
    this.burst(t.c + 0.5, t.r + 0.5, "#b7ab90", 4, "smoke");
    sfx.place();
    this.notify();
  }

  startWave() {
    this.finishWaveIfClear();
    if (this.phase !== "ready") return;
    if (this.wave >= this.map.waves.length) return;
    this.wave += 1;
    const plan = this.map.waves[this.wave - 1];
    this.spawnQ = [];
    for (const pack of plan) {
      for (let i = 0; i < pack.count; i++) {
        this.spawnQ.push({ t: this.time + pack.delay + i * pack.gap, kind: pack.kind });
      }
    }
    this.phase = "wave";
    this.paused = false;
    this.autoPaused = false;
    for (const t of this.towers) t.volley = true;
    const tithe = Math.min(28, Math.floor(this.gold * 0.06));
    if (tithe > 0) {
      this.gold += tithe;
    }
    this.trauma = Math.min(1, this.trauma + 0.08);
    const aside = this.map.asides[this.wave - 1];
    if (this.towers.length === 0) {
      this.banner = { text: "The road is bare", life: 1.8, max: 1.8 };
    } else if (this.wave % 4 === 0) {
      this.banner = { text: "Night run — they come fast", life: 2.3, max: 2.3 };
    } else {
      this.banner = { text: aside ?? `Wave ${this.wave}`, life: 2, max: 2 };
    }
    if (this.wave >= 2) {
      const roll = this.wave % 3;
      if (roll === 2) {
        this.hero = { who: "Sera", line: "Horn is free. Blow it.", kind: "horn" };
      } else if (roll === 0) {
        this.hero = { who: "Ash", line: "Mend is cheap. Use it.", kind: "mend" };
      } else {
        this.hero = { who: "Lumen", line: "Coin from the ditch.", kind: "gold" };
        this.gold += 22;
        this.float(COLS / 2, 0.7, "+22", "#d4a054");
      }
      this.heroT = 8;
      this.banner = { text: `${this.hero.who}: ${this.hero.line}`, life: 2.4, max: 2.4 };
    }
    sfx.wave();
    this.notify();
  }

  waypoint(i: number) {
    const p = this.path[Math.max(0, Math.min(this.path.length - 1, i))];
    return { x: p.c + 0.5, y: p.r + 0.5 };
  }

  spawn(kind: CreepKind) {
    const start = this.waypoint(0);
    const next = this.waypoint(1);
    const backX = Math.min(COLS - 0.2, Math.max(0.2, start.x - (next.x - start.x) * 0.25));
    const backY = Math.min(ROWS - 0.2, Math.max(0.2, start.y - (next.y - start.y) * 0.25));
    const stats = CREEPS[kind];
    this.creeps.push({
      id: this.nextId++,
      kind,
      x: backX,
      y: backY,
      hp: stats.hp,
      maxHp: stats.hp,
      wp: 1,
      slowT: 0,
      alive: true,
      progress: 0,
      facing: 0,
      flash: 0,
      spawn: 0,
      death: 0,
      squash: 1,
      healT: 1.2,
      rootT: 0,
    });
    this.burst(start.x, start.y, "#e07838", 3, "ember");
  }

  burst(x: number, y: number, color: string, n: number, kind: Particle["kind"] = "spark") {
    if (this.reducedMotion) return;
    if (this.particles.length > 160) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = kind === "smoke" ? 0.2 + Math.random() * 0.35 : 0.45 + Math.random() * 1.1;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - (kind === "ember" ? 0.5 : 0),
        life: kind === "ring" ? 0.28 : 0.2 + Math.random() * 0.22,
        max: kind === "ring" ? 0.28 : 0.42,
        size: kind === "ring" ? 0.12 : 0.03 + Math.random() * 0.05,
        color,
        kind,
        rot: a,
      });
    }
  }

  ring(x: number, y: number, color: string) {
    if (this.reducedMotion) return;
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.34,
      max: 0.34,
      size: 0.12,
      color,
      kind: "ring",
      rot: 0,
    });
  }

  float(x: number, y: number, text: string, color: string) {
    if (this.floaters.length > 36) this.floaters.splice(0, 12);
    this.floaters.push({ x, y, text, life: 0.85, max: 0.85, color });
  }

  damageCreep(creep: Creep, amount: number, slow: number, ignoreArmor = false, quiet = false) {
    const armor = ignoreArmor ? Math.floor(CREEPS[creep.kind].armor * 0.35) : CREEPS[creep.kind].armor;
    const dealt = Math.max(1, amount - armor);
    creep.hp -= dealt;
    creep.flash = 1;
    creep.squash = 0.78;
    if (slow > 0) creep.slowT = Math.max(creep.slowT, this.relics.has("cold") ? 2.1 : 1.35);
    if (!quiet && (dealt >= 12 || slow > 0)) {
      this.float(creep.x, creep.y - 0.28, `${Math.round(dealt)}`, slow ? "#6aa8b4" : "#e8dcc4");
    }
    if (creep.hp <= 0 && creep.alive) {
      creep.alive = false;
      creep.death = 0.28;
      const gold =
        CREEPS[creep.kind].gold +
        this.towers.filter((t) => towerForm(t.dmgLvl, t.rateLvl) >= 4).length +
        (this.wave % 4 === 0 ? 2 : 0);
      this.gold += gold;
      this.streakT = 3.2;
      this.streak += 1;
      if (this.streak >= 4 && this.streak % 2 === 0) {
        this.gold += 3;
        this.float(creep.x, creep.y - 0.5, `streak +3`, "#e07838");
      }
      if (this.streak > 0 && this.streak % 6 === 0) {
        let best: Creep | null = null;
        let bestD = 99;
        for (const other of this.creeps) {
          if (!other.alive) continue;
          const d = Math.hypot(other.x - creep.x, other.y - creep.y);
          if (d < bestD) {
            bestD = d;
            best = other;
          }
        }
        if (best) {
          best.rootT = Math.max(best.rootT, 0.7);
          this.float(best.x, best.y - 0.35, "Pinned", "#6aa8b4");
          this.ring(best.x, best.y, "#6aa8b4");
        }
      }
      this.float(creep.x, creep.y, `+${gold}`, "#d4a054");
      this.burst(creep.x, creep.y, creep.kind === "lord" ? "#e07838" : "#5a7a48", creep.kind === "lord" ? 22 : 12, "spark");
      this.burst(creep.x, creep.y, "#3a4432", 6, "smoke");
      this.ring(creep.x, creep.y, "#d4a054");
      if (creep.kind === "lord") {
        this.trauma = Math.min(1, this.trauma + 0.55);
        this.hitstop = Math.max(this.hitstop, 0.08);
      }
      sfx.kill();
    } else {
      sfx.hit();
    }
  }

  fire(tower: Tower, target: Creep) {
    const def = TOWERS[tower.kind];
    const form = towerForm(tower.dmgLvl, tower.rateLvl);
    let dmg =
      damageAt(tower.kind, tower.dmgLvl) *
      (this.relics.has("whet") ? 1.12 : 1) *
      (this.relics.has("ember") && tower.kind === "mortar" ? 1.2 : 1) *
      (1 + (form - 1) * 0.06) *
      this.lineBonus(tower) *
      (this.focusId === target.id ? 1.1 : 1);
    if (tower.kind === "mortar" && target.kind === "shell") dmg *= 1.28;
    if (tower.kind === "bramble" && target.kind === "shell") dmg *= 1.18;
    if ((tower.kind === "frost" || tower.kind === "ward") && target.kind === "hound") dmg *= 1.22;
    if (tower.kind === "frost" && target.kind === "runner") dmg *= 1.16;
    if ((tower.kind === "spark" || tower.kind === "bow") && target.kind === "wisp") dmg *= 1.18;
    if (tower.kind === "bramble" && target.kind === "runner") dmg *= 1.2;
    if (tower.kind === "spark" && target.kind === "shaman") dmg *= 1.14;
    if (tower.volley) {
      if (this.relics.has("flint")) dmg *= 1.4;
      tower.volley = false;
    }
    this.focusId = target.id;
    const rate = rateAt(tower.kind, tower.rateLvl);
    tower.cooldown = 1 / rate;
    tower.angle = Math.atan2(target.y - (tower.r + 0.5), target.x - (tower.c + 0.5));
    tower.recoil = 1;
    const muzzle = 0.38;
    const sx = tower.c + 0.5 + Math.cos(tower.angle) * muzzle;
    const sy = tower.r + 0.5 + Math.sin(tower.angle) * muzzle;
    if (tower.kind === "ward") {
      const range = rangeAt(tower.kind, tower.dmgLvl) * (this.relics.has("glass") ? 1.12 : 1) * (tower.empowered ? 1.18 : 1);
      this.ring(tower.c + 0.5, tower.r + 0.5, "#d4a054");
      for (const c of this.creeps) {
        if (!c.alive) continue;
        const dx = c.x - (tower.c + 0.5);
        const dy = c.y - (tower.r + 0.5);
        if (dx * dx + dy * dy <= range * range) this.damageCreep(c, dmg, def.slow + (form >= 3 ? 0.12 : 0));
      }
      return;
    }
    const splash = tower.kind === "frost" && form >= 3 ? (form >= 4 ? 0.95 : 0.7) : def.splash;
    if (def.beam) {
      this.beams.push({
        x1: sx,
        y1: sy,
        x2: target.x,
        y2: target.y,
        life: 0.16,
        max: 0.16,
        color: form >= 4 ? "#fff4c8" : "#e8c56a",
      });
      this.damageCreep(target, dmg, 0, true);
      this.burst(target.x, target.y, "#e8c56a", form >= 3 ? 11 : 8, "spark");
      if (form >= 3) {
        const chained = new Set<number>([target.id]);
        const hops = form >= 4 ? 2 : 1;
        let from = target;
        for (let h = 0; h < hops; h++) {
          const extra = this.pickTarget(tower, chained);
          if (!extra) break;
          const dx = extra.x - from.x;
          const dy = extra.y - from.y;
          if (dx * dx + dy * dy > 1.6 * 1.6) break;
          chained.add(extra.id);
          this.beams.push({
            x1: from.x,
            y1: from.y,
            x2: extra.x,
            y2: extra.y,
            life: 0.1,
            max: 0.1,
            color: "#fff3c0",
          });
          this.damageCreep(extra, dmg * (0.7 - h * 0.12), 0, true);
          from = extra;
        }
      }
      sfx.shootSpark();
      return;
    }
    this.shots.push({
      id: this.nextId++,
      kind: tower.kind,
      x: sx,
      y: sy,
      px: sx,
      py: sy,
      tx: target.x,
      ty: target.y,
      targetId: target.id,
      speed: def.projectileSpeed,
      damage: dmg,
      splash,
      slow: def.slow * (this.relics.has("cold") && tower.kind === "frost" ? 1.35 : 1) * (form >= 4 && tower.kind === "frost" ? 1.2 : 1),
      ttl: 1.4,
      angle: tower.angle,
      pierce: tower.kind === "bow" ? (form >= 4 ? 2 : form >= 3 ? 1 : 0) : 0,
      hit: new Set(),
      form,
      ox: sx,
      oy: sy,
    });
    const spark = tower.kind === "frost" ? "#6aa8b4" : tower.kind === "mortar" ? "#e07838" : "#d4a054";
    if (tower.kind === "mortar") this.burst(sx, sy, spark, 2, "spark");
    if (tower.kind === "bow") sfx.shootBow();
    else if (tower.kind === "mortar") sfx.shootMortar();
    else if (tower.kind === "bramble") sfx.shootBramble();
    else sfx.shootFrost();
    if (tower.kind === "bramble" && form >= 3) {
      target.rootT = Math.max(target.rootT, form >= 4 ? 0.95 : 0.55);
    }
  }

  pickTarget(tower: Tower, ignore: Set<number> = new Set()): Creep | null {
    const range = rangeAt(tower.kind, tower.dmgLvl) * (this.relics.has("glass") ? 1.12 : 1) * (tower.empowered ? 1.18 : 1);
    const cx = tower.c + 0.5;
    const cy = tower.r + 0.5;
    const r2 = range * range;
    let best: Creep | null = null;
    let score = tower.aim === "last" || tower.aim === "close" ? Infinity : -1;
    for (const creep of this.creeps) {
      if (!creep.alive || ignore.has(creep.id)) continue;
      if (CREEPS[creep.kind].flying && !TOWERS[tower.kind].hitsAir) continue;
      const dx = creep.x - cx;
      const dy = creep.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      if (tower.aim === "first" && creep.progress > score) {
        score = creep.progress;
        best = creep;
      } else if (tower.aim === "last" && creep.progress < score) {
        score = creep.progress;
        best = creep;
      } else if (tower.aim === "close" && d2 < score) {
        score = d2;
        best = creep;
      } else if (tower.aim === "strong") {
        const threat =
          creep.hp + (creep.kind === "lord" ? 400 : creep.kind === "shaman" ? 180 : 0);
        if (threat > score) {
          score = threat;
          best = creep;
        }
      }
    }
    return best;
  }

  impact(shot: Shot, x: number, y: number) {
    const color = shot.kind === "frost" ? "#6aa8b4" : shot.kind === "mortar" ? "#e07838" : "#d4a054";
    this.burst(x, y, color, shot.kind === "mortar" ? 5 : shot.splash > 0 ? 8 : 5, "spark");
    if (shot.kind !== "mortar") this.ring(x, y, color);
    if (shot.splash > 0) {
      this.burst(x, y, "#4a3a22", shot.kind === "mortar" ? 3 : 6, "smoke");
      const r2 = shot.splash * shot.splash;
      for (const creep of this.creeps) {
        if (!creep.alive) continue;
        const dx = creep.x - x;
        const dy = creep.y - y;
        if (dx * dx + dy * dy <= r2) this.damageCreep(creep, shot.damage, shot.slow, false, true);
      }
      this.trauma = Math.min(1, this.trauma + (shot.kind === "mortar" ? 0.05 : 0.1));
      this.hitstop = Math.max(this.hitstop, shot.kind === "mortar" ? 0.02 : 0.035);
      if (shot.kind === "mortar") {
        const form = shot.form || 1;
        this.burns.push({ x, y, r: 0.48 + form * 0.06, life: 1.5 + form * 0.2, tick: 0 });
      }
      return;
    }
    const target = this.creeps.find((c) => c.id === shot.targetId && c.alive);
    if (target) {
      shot.hit.add(target.id);
      this.damageCreep(target, shot.damage, shot.slow);
    }
    if (shot.pierce > 0) {
      shot.pierce -= 1;
      const next = this.creeps.find((c) => {
        if (!c.alive || shot.hit.has(c.id)) return false;
        const dx = c.x - shot.x;
        const dy = c.y - shot.y;
        return dx * dx + dy * dy < 1.6 * 1.6;
      });
      if (next) {
        shot.targetId = next.id;
        shot.tx = next.x;
        shot.ty = next.y;
        shot.ttl = Math.max(shot.ttl, 0.35);
        return;
      }
    }
    shot.ttl = -1;
  }

  step(dt: number) {
    this.time += dt;
    this.stepFx(dt);

    if (this.phase === "title" || this.phase === "brief" || this.phase === "shop" || this.phase === "stall" || this.phase === "won" || this.phase === "lost") return;
    if (this.paused) return;

    if (this.hitstop > 0) {
      this.hitstop -= dt;
      this.finishWaveIfClear();
      return;
    }

    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    this.streakT = Math.max(0, this.streakT - dt);
    if (this.streakT <= 0) this.streak = 0;
    this.hornCd = Math.max(0, this.hornCd - dt);
    if (this.phase === "ready") {
      this.farmT += dt;
      if (this.farmT >= 3.2) {
        this.farmT = 0;
        this.gold += 1;
      }
    }
    if (this.phase === "wave") {
      this.farmT += dt;
      if (this.farmT >= 1.15) {
        this.farmT = 0;
        const n = this.towers.filter((t) => towerForm(t.dmgLvl, t.rateLvl) >= 4).length;
        if (n > 0) {
          const pay = n * (this.lives <= 5 ? 2 : 1);
          this.gold += pay;
        }
      }
    }
    if (this.heroT > 0) {
      this.heroT -= dt;
      if (this.heroT <= 0) this.hero = null;
    }
    if (this.banner) {
      this.banner.life -= dt;
      if (this.banner.life <= 0) this.banner = null;
    }

    if (this.phase === "wave") {
      const still = [];
      for (const s of this.spawnQ) {
        if (s.t <= this.time) this.spawn(s.kind);
        else still.push(s);
      }
      this.spawnQ = still;
    }

    for (const creep of this.creeps) {
      if (!creep.alive) {
        creep.death -= dt;
        continue;
      }
      const stats = CREEPS[creep.kind];
      const target = this.waypoint(creep.wp);
      const dx = target.x - creep.x;
      const dy = target.y - creep.y;
      const dist = Math.hypot(dx, dy);
      const slow =
        (creep.rootT > 0 ? 0.12 : creep.slowT > 0 ? 0.58 : 1) *
        (stats.flying ? 1 : this.fordSlow(creep.x, creep.y));
      creep.slowT = Math.max(0, creep.slowT - dt);
      creep.rootT = Math.max(0, creep.rootT - dt);
      creep.flash = Math.max(0, creep.flash - dt * 6);
      creep.spawn = Math.min(1, creep.spawn + dt * 4);
      creep.squash += (1 - creep.squash) * Math.min(1, dt * 10);
      if (stats.heal > 0) {
        creep.healT -= dt;
        if (creep.healT <= 0) {
          creep.healT = 1.8;
          for (const other of this.creeps) {
            if (!other.alive || CREEPS[other.kind].flying) continue;
            const hx = other.x - creep.x;
            const hy = other.y - creep.y;
            if (hx * hx + hy * hy <= 1.45 * 1.45) {
              other.hp = Math.min(other.maxHp, other.hp + stats.heal * (this.relics.has("salt") ? 0.5 : 1));
            }
          }
          this.ring(creep.x, creep.y, "#7a9a58");
        }
      }
      const stepLen = stats.speed * slow * dt * (this.wave % 4 === 0 ? 1.16 : 1);
      if (dist > 0.001) creep.facing = Math.atan2(dy, dx);
      if (dist <= stepLen + 0.02) {
        creep.x = target.x;
        creep.y = target.y;
        creep.wp += 1;
        if (creep.wp >= this.path.length) {
          creep.alive = false;
          creep.death = 0.18;
          const wound = leakCost(creep.kind);
          this.lives = Math.max(0, this.lives - wound);
          this.streak = 0;
          this.trauma = Math.min(1, this.trauma + (creep.kind === "lord" ? 0.7 : 0.4));
          sfx.leak();
          this.burst(creep.x, creep.y, "#c45c4a", 6, "ember");
          this.ring(creep.x, creep.y, "#c45c4a");
          this.float(creep.x, creep.y - 0.4, `-${wound}`, "#c45c4a");
          this.banner =
            this.lives > 0 && this.lives <= 5
              ? { text: "Last stand — the line fires hotter", life: 2.2, max: 2.2 }
              : creep.kind === "lord"
                ? { text: "The Emberlord is in", life: 1.4, max: 1.4 }
                : { text: wound > 1 ? `Breach −${wound}` : "Breach", life: 0.8, max: 0.8 };
          if (this.lives <= 0) {
            this.lives = 0;
            this.phase = "lost";
            sfx.lose();
            this.notify();
            return;
          }
        }
      } else {
        creep.x += (dx / dist) * stepLen;
        creep.y += (dy / dist) * stepLen;
      }
      creep.progress = creep.wp + (1 - Math.min(1, dist));
    }

    for (const tower of this.towers) {
      tower.cooldown = Math.max(0, tower.cooldown - dt * (this.lives <= 5 ? 1.18 : 1));
      tower.recoil = Math.max(0, tower.recoil - dt * 5.5);
      tower.build = Math.min(1, tower.build + dt * 3.4);
      const target = this.pickTarget(tower);
      if (target) {
        tower.angle = Math.atan2(target.y - (tower.r + 0.5), target.x - (tower.c + 0.5));
        if (tower.cooldown <= 0) this.fire(tower, target);
      }
      let da = tower.angle - tower.visAngle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      tower.visAngle += da * Math.min(1, dt * 12);
    }

    for (const shot of this.shots) {
      shot.ttl -= dt;
      shot.px = shot.x;
      shot.py = shot.y;
      const target = this.creeps.find((c) => c.id === shot.targetId && c.alive);
      if (target) {
        shot.tx = target.x;
        shot.ty = target.y;
      }
      const dx = shot.tx - shot.x;
      const dy = shot.ty - shot.y;
      const dist = Math.hypot(dx, dy);
      const stepLen = shot.speed * dt;
      if (dist > 0.001) shot.angle = Math.atan2(dy, dx);
      if (dist <= stepLen || shot.ttl <= 0) {
        this.impact(shot, shot.tx, shot.ty);
      } else {
        shot.x += (dx / dist) * stepLen;
        shot.y += (dy / dist) * stepLen;
        if (!this.reducedMotion && shot.kind !== "mortar" && this.particles.length < 140) {
          this.particles.push({
            x: shot.x,
            y: shot.y,
            vx: 0,
            vy: 0,
            life: 0.1,
            max: 0.1,
            size: 0.04,
            color: shot.kind === "frost" ? "#6aa8b4" : "#d4a054",
            kind: "ember",
            rot: 0,
          });
        }
      }
    }
    this.shots = this.shots.filter((s) => s.ttl > 0);
    if (this.shots.length > 96) this.shots.splice(0, this.shots.length - 96);
    for (const b of this.beams) b.life -= dt;
    this.beams = this.beams.filter((b) => b.life > 0);
    for (const burn of this.burns) {
      burn.life -= dt;
      burn.tick += dt;
      if (burn.tick >= 0.4) {
        burn.tick = 0;
        for (const creep of this.creeps) {
          if (!creep.alive || CREEPS[creep.kind].flying) continue;
          const dx = creep.x - burn.x;
          const dy = creep.y - burn.y;
          if (dx * dx + dy * dy <= burn.r * burn.r) {
            this.damageCreep(creep, this.relics.has("ember") ? 7.2 : 6, 0);
          }
        }
      }
    }
    this.burns = this.burns.filter((b) => b.life > 0);
    if (this.burns.length > 28) this.burns.splice(0, this.burns.length - 28);
    this.creeps = this.creeps.filter((c) => c.alive || c.death > 0);
    this.finishWaveIfClear();
  }

  finishWaveIfClear() {
    if (this.phase !== "wave") return;
    if (this.spawnQ.length > 0) return;
    if (this.creeps.some((c) => c.alive)) return;
    this.creeps = [];
    this.shots = [];
    this.beams = [];
    this.scoreGrade();
    if (this.wave >= this.map.waves.length) {
      if (this.mapIndex < MAPS.length - 1) {
        this.phase = "shop";
        this.gold += 70;
        this.unlocked = Math.max(this.unlocked, this.mapIndex + 1);
        this.persist();
        this.banner = { text: `${this.map.name} held`, life: 2.2, max: 2.2 };
        sfx.win();
      } else {
        this.phase = "won";
        this.unlocked = Math.max(this.unlocked, MAPS.length);
        this.persist();
        sfx.win();
      }
      this.trauma = 0.25;
    } else {
      this.phase = "ready";
      this.gold += 42 + this.wave * 7 + this.mapIndex * 8;
      const interest = Math.floor(this.gold * 0.03);
      if (interest > 0) {
        this.gold += interest;
        this.float(COLS / 2, 0.55, `Interest +${interest}`, "#d4a054");
      }
      this.banner = { text: `Wave ${this.wave} held`, life: 1.6, max: 1.6 };
      this.float(COLS / 2, 0.45, "Road clear", "#d4a054");
      const last = this.towers[this.towers.length - 1];
      if (last) {
        this.selectedId = last.id;
        this.selectedKind = null;
      }
    }
    this.notify();
  }

  scoreGrade() {
    const crowned = this.towers.filter((t) => towerForm(t.dmgLvl, t.rateLvl) >= 4).length;
    const life = this.lives / Math.max(1, this.maxLives());
    const rank = life >= 0.75 && this.gold >= 50 ? "Dawn" : life >= 0.45 ? "Dusk" : "Ember";
    this.grade = `${rank} · ${this.lives} lives · ${this.gold}g · ${crowned} crowned`;
  }

  stepFx(dt: number) {
    this.moteAcc += dt;
    if (!this.reducedMotion && !this.paused && this.moteAcc > 0.18 && this.particles.length < 140) {
      this.moteAcc = 0;
      const gate = this.waypoint(0);
      this.particles.push({
        x: gate.x + (Math.random() - 0.5) * 0.5,
        y: gate.y + (Math.random() - 0.5) * 0.3,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -0.45 - Math.random() * 0.4,
        life: 1.4,
        max: 1.4,
        size: 0.04 + Math.random() * 0.04,
        color: "#e07838",
        kind: "mote",
        rot: 0,
      });
    }
    if (this.paused) return;
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === "smoke") {
        p.vy -= 0.6 * dt;
        p.size += dt * 0.12;
      } else if (p.kind === "ember" || p.kind === "mote") {
        p.vy -= 0.35 * dt;
      } else if (p.kind !== "ring") {
        p.vy += 1.4 * dt;
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const f of this.floaters) {
      f.life -= dt;
      f.y -= dt * 0.55;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    this.maybeNotify();
  }

  maybeNotify() {
    const key = `${this.gold}|${this.lives}|${this.wave}|${this.phase}|${this.mapIndex}|${this.relics.size}|${this.creeps.length}|${this.spawnQ.length}|${this.selectedId}|${this.selectedKind}|${this.aim}|${this.paused}|${this.speed}|${this.streak}|${Math.ceil(this.hornCd)}|${this.canUndo()}`;
    if (key !== this.hudKey) {
      this.hudKey = key;
      this.notify();
    }
  }

  tick(frameDt: number) {
    try {
      if (!Number.isFinite(frameDt) || frameDt < 0) return;
      if (this.paused && this.phase !== "title") {
        this.finishWaveIfClear();
        this.maybeNotify();
        return;
      }
      const dt = Math.min(frameDt * this.speed, 0.2);
      this.acc += dt;
      if (this.acc > TICK * 12) this.acc = TICK * 8;
      let steps = 0;
      while (this.acc >= TICK && steps < 8) {
        this.step(TICK);
        this.acc -= TICK;
        steps += 1;
      }
      this.maybeNotify();
    } catch (err) {
      console.error("emberline tick", err);
      this.acc = 0;
    }
  }
}
