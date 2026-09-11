import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { COLS, CREEPS, START_GOLD, START_LIVES, HARD_LIVES, TOWERS, pathCells, blockedCells } from "./config.ts";
import { MAPS, leakCost, pathCellsOf, planHasAir, shopFor, watchOrderFor } from "./campaign.ts";
import { EmberEngine } from "./engine.ts";

function play(): EmberEngine {
  const e = new EmberEngine();
  e.startFromTitle();
  e.dismissBrief();
  e.reducedMotion = true;
  return e;
}

function emptyGrass(e: EmberEngine): { c: number; r: number } {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < COLS; c++) {
      if (e.canBuild(c, r)) return { c, r };
    }
  }
  throw new Error("no buildable cell");
}

describe("maps and shop", () => {
  it("ships eight maps ending at the wicker span", () => {
    assert.equal(MAPS.length, 8);
    assert.equal(MAPS[4].id, "ember-copse");
    assert.equal(MAPS[5].id, "glass-marsh");
    assert.equal(MAPS[6].id, "ash-hollow");
    assert.equal(MAPS[7].id, "wicker-span");
    assert.ok(shopFor(1, 0).some((s) => s.id === "cord"));
    assert.ok(shopFor(2, 0).some((s) => s.id === "flint"));
  });

  it("ships a visual field profile for every campaign map", () => {
    for (const map of MAPS) {
      assert.ok(map.profile.label.length > 0);
      assert.ok(map.profile.detail.length > 0);
      assert.ok(
        ["lanterns", "pine-fog", "keep-ash", "river-rain", "emberfall", "glass-tide", "ash-draw", "wicker-draft"].includes(
          map.profile.ambient,
        ),
      );
      assert.ok(["gate", "pine", "keep", "rock", "glass", "ash", "wicker"].includes(map.profile.marker));
      assert.ok(map.profile.rule.label.length > 0);
      assert.ok(map.profile.rule.objectiveTitle.length > 0);
      assert.ok(map.profile.rule.target > 0);
      assert.ok(map.profile.rule.reward > 0);
    }

    const e = play();
    assert.deepEqual(e.hud().field, MAPS[0].profile);
    assert.match(e.renderText(), /"field":\{"label":"Lantern bends"/);
  });

  it("keeps every map path axis-aligned and on the board", () => {
    for (const map of MAPS) {
      assert.ok(map.path.length >= 2);
      for (let i = 0; i < map.path.length; i++) {
        const p = map.path[i];
        assert.ok(p.c >= 0 && p.c < COLS && p.r >= 0 && p.r < 9);
        if (i === 0) continue;
        const prev = map.path[i - 1];
        const axis = p.c === prev.c || p.r === prev.r;
        assert.equal(axis, true, `${map.id} segment ${i} is diagonal`);
      }
      const cells = pathCellsOf(map.path);
      for (const w of map.water) {
        assert.equal(cells.has(`${w[0]},${w[1]}`), false, `${map.id} water on path`);
      }
      for (const prop of map.props) {
        assert.equal(cells.has(`${prop.c},${prop.r}`), false, `${map.id} prop on path`);
      }
    }
  });

  it("drops stall prices with wave and map, never below 18", () => {
    const early = shopFor(0, 0).find((s) => s.id === "purse")!;
    const late = shopFor(2, 8).find((s) => s.id === "purse")!;
    assert.ok(late.cost < early.cost);
    assert.ok(late.cost >= 18);
    assert.ok(!shopFor(0, 0).some((s) => s.id === "ember"));
    assert.ok(shopFor(2, 0).some((s) => s.id === "ember"));
  });

  it("assigns a deterministic watch order from the strongest threat", () => {
    assert.equal(watchOrderFor(MAPS[0].waves[0])?.id, "clean");
    assert.equal(watchOrderFor(MAPS[1].waves[0])?.id, "sky");
    assert.equal(watchOrderFor(MAPS[2].waves[2])?.id, "song");
    assert.equal(watchOrderFor(MAPS[3].waves[4])?.id, "crown");
    assert.equal(watchOrderFor(undefined), null);
  });

  it("legacy PATH helper still matches the first map", () => {
    const a = [...pathCells()].sort();
    const b = [...pathCellsOf(MAPS[0].path)].sort();
    assert.deepEqual(a, b);
    assert.ok(blockedCells().size > 0);
  });

  it("makes the glass tide rule reward deliberate waterline placement", () => {
    const e = play();
    e.loadMap(MAPS.findIndex((map) => map.id === "glass-marsh"));
    e.clearField();
    e.phase = "ready";
    e.gold = 400;
    const cells = [...Array(9).keys()].flatMap((r) => [...Array(COLS).keys()].map((c) => ({ c, r })));
    const nearWater = cells.find((cell) => e.canBuild(cell.c, cell.r) && e.besideWater(cell));
    assert.ok(nearWater);
    e.tapCell(nearWater.c, nearWater.r);
    const tower = e.towers[0];
    assert.equal(e.hud().objective.current, 1);
    assert.equal(e.fieldRangeMultiplier(tower), 1.14);

    e.chooseKind("spark");
    const secondNearWater = cells.find((cell) => e.canBuild(cell.c, cell.r) && e.besideWater(cell));
    assert.ok(secondNearWater);
    e.tapCell(secondNearWater.c, secondNearWater.r);
    assert.equal(e.hud().objective.complete, true);
    assert.equal(e.fieldDamageMultiplier(e.towers[1]), 1.12);
  });
});

describe("EmberEngine", () => {
  it("describes pierce as a form, not a damage-only upgrade", () => {
    assert.equal(TOWERS.bow.blurb.includes("Tempered pierces"), true);
    assert.equal(TOWERS.bow.blurb.includes("Emberlit"), true);
    assert.equal(TOWERS.mortar.blurb.includes("wisps"), true);
    assert.equal(TOWERS.ward.blurb.includes("ring"), true);
  });

  it("last stand cheapens the horn", () => {
    const e = play();
    e.lives = 5;
    e.notify();
    assert.equal(e.hud().hornCost, Math.max(20, Math.floor(45 * 0.65)));
  });

  it("strong aim prefers a shaman over a grub", () => {
    const e = play();
    e.gold = 400;
    const grass = emptyGrass(e);
    e.tapCell(grass.c, grass.r);
    e.towers[0].aim = "strong";
    e.spawn("grub");
    e.spawn("shaman");
    for (const c of e.creeps) {
      c.x = grass.c + 0.5;
      c.y = grass.r + 0.5;
    }
    assert.equal(e.pickTarget(e.towers[0])?.kind, "shaman");
  });

  it("toggles a stamp off if you pick it twice", () => {
    const e = play();
    e.chooseKind("mortar");
    assert.equal(e.selectedKind, "mortar");
    e.chooseKind("mortar");
    assert.equal(e.selectedKind, null);
  });

  it("keeps a counter armed when the recommended packet is already selected", () => {
    const e = play();
    e.chooseCounter("bow");
    assert.equal(e.selectedKind, "bow");
    e.chooseCounter("bow");
    assert.equal(e.selectedKind, "bow");
    e.chooseCounter("mortar");
    assert.equal(e.selectedKind, "mortar");
  });

  it("hydrates saved progress into the initial HUD snapshot", () => {
    const previous = (globalThis as typeof globalThis & { localStorage?: Storage }).localStorage;
    const stored = JSON.stringify({ relics: ["purse"], unlocked: 3, muted: false });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: () => stored,
        setItem: () => undefined,
      } satisfies Pick<Storage, "getItem" | "setItem">,
    });

    try {
      const e = new EmberEngine();
      e.readSave();

      assert.equal(e.hud().unlocked, 3);
      assert.deepEqual(e.hud().relics, ["purse"]);
    } finally {
      if (previous) {
        Object.defineProperty(globalThis, "localStorage", { configurable: true, value: previous });
      } else {
        Reflect.deleteProperty(globalThis, "localStorage");
      }
    }
  });

  it("exposes the current route and next-wave threat forecast", () => {
    const e = play();
    const initial = e.hud();

    assert.equal(initial.route.length, MAPS.length);
    assert.equal(initial.route[0].state, "current");
    assert.equal(initial.route[1].state, "locked");
    assert.equal(initial.route[1].unlockHint, "Hold The Low Road to open");
    assert.equal(initial.route[0].waveCount, MAPS[0].waves.length);
    assert.equal(initial.route[0].threatTier, "light");
    assert.equal(initial.route[0].hasAir, false);
    assert.equal(initial.previewWave, 1);
    assert.deepEqual(initial.wavePreview, [{ kind: "grub", count: 8 }]);
    assert.equal(initial.threatTier, "light");
    assert.equal(initial.waveTotal, 0);
    assert.equal(initial.waveProgress, 0);

    e.startWave();
    const firstWave = e.hud();
    assert.equal(firstWave.phase, "wave");
    assert.equal(firstWave.wave, 1);
    assert.equal(firstWave.waveTotal, 8);
    assert.equal(firstWave.waveProgress, 0);

    e.unlocked = 2;
    e.loadMap(1);
    e.notify();
    assert.equal(e.hud().route[0].state, "held");
    assert.equal(e.hud().route[1].state, "current");
    assert.equal(e.hud().route[2].state, "available");
    assert.equal(e.hud().route[3].unlockHint, "Hold Keep Stair to open");
  });

  it("tracks and pays an optional watch order", () => {
    const e = play();
    assert.equal(e.hud().watchOrder?.id, "clean");

    e.startWave();
    assert.equal(e.hud().watchOrder?.id, "clean");
    e.spawnQ = [];
    e.creeps = [];
    e.finishWaveIfClear();

    assert.match(e.hud().bannerText ?? "", /Order \+22g/);
    assert.equal(e.hud().lastResult?.earned, 98);
    assert.equal(e.hud().lastResult?.hold, "clean");
    assert.equal(e.hud().lastResult?.orderHeld, true);
    assert.equal(e.hud().lastResult?.orderPayout, 22);
    assert.equal(e.hud().lastResult?.orderChain, 1);
    assert.equal(e.hud().watchOrder?.chain, 1);
    assert.equal(e.hud().watchOrder?.payout, 28);
    const text = JSON.parse(e.renderText()) as { watchOrder: { id: string } };
    assert.equal(text.watchOrder.id, "clean");
  });

  it("shows line quality and breaks the watch chain after missed orders", () => {
    const e = play();
    e.startWave();
    e.spawnQ = [];
    e.creeps = [];
    e.finishWaveIfClear();

    e.startWave();
    e.waveLeaks = 1;
    e.spawnQ = [];
    e.creeps = [];
    e.finishWaveIfClear();

    assert.equal(e.hud().lastResult?.hold, "frayed");
    assert.equal(e.hud().lastResult?.orderHeld, false);
    assert.equal(e.hud().lastResult?.orderPayout, 0);
    assert.equal(e.hud().lastResult?.orderChain, 0);
    assert.equal(e.hud().watchOrder?.chain, 0);
    assert.match(e.hud().bannerText ?? "", /line frayed/);
  });

  it("shows targeted watch-order progress during an air wave", () => {
    const e = play();
    e.loadMap(1);
    e.gold = 500;
    const grass = emptyGrass(e);
    e.tapCell(grass.c, grass.r);
    e.startWave();

    assert.equal(e.hud().watchOrder?.id, "sky");
    e.waveKillCounts.wisp = 2;
    e.notify();
    assert.equal(e.hud().watchOrder?.current, 2);
    assert.equal(e.hud().watchOrder?.complete, false);
    e.waveKillCounts.wisp = 3;
    e.notify();
    assert.equal(e.hud().watchOrder?.complete, true);
  });

  it("keeps the next unlocked route available while replaying a held map", () => {
    const e = play();
    e.unlocked = 4;
    e.loadMap(0);
    e.notify();

    assert.equal(e.hud().route[0].state, "current");
    assert.equal(e.hud().route[3].state, "held");
    assert.equal(e.hud().route[4].state, "available");

    e.phase = "title";
    e.selectCampaignMap(4);
    assert.equal(e.mapIndex, 4);
    assert.equal(e.hud().route[4].state, "current");
  });

  it("starts a watch with gold, lives, and a buildable field", () => {
    const e = play();
    assert.equal(e.phase, "ready");
    assert.equal(e.gold, START_GOLD);
    assert.equal(e.lives, START_LIVES);
    const grass = emptyGrass(e);
    e.tapCell(grass.c, grass.r);
    assert.equal(e.towers.length, 1);
    assert.equal(e.gold, START_GOLD - TOWERS.bow.cost);
    assert.equal(e.selectedKind, null);
    assert.equal(e.selectedId, e.towers[0].id);
  });

  it("records the upgrade branch while the forge effect is active", () => {
    const e = play();
    e.gold = 500;
    const grass = emptyGrass(e);
    e.tapCell(grass.c, grass.r);
    const tower = e.towers[0];

    e.upgradeDamage();

    assert.equal(tower.dmgLvl, 2);
    assert.equal(tower.upgradeBranch, "damage");
    assert.equal(tower.lastUpgrade, "damage");
    assert.ok(tower.upgradeT > 0);
    assert.equal(e.hud().formName, "Bound");
    const text = JSON.parse(e.renderText()) as {
      selectedTower: {
        form: string;
        upgrade: { branch: string; active: boolean };
        lastUpgrade: string;
      };
    };
    assert.equal(text.selectedTower.form, "Bound");
    assert.deepEqual(text.selectedTower.upgrade, { branch: "damage", active: true });
    assert.equal(text.selectedTower.lastUpgrade, "damage");

    e.stepFx(2);
    assert.equal(tower.upgradeBranch, null);
    assert.equal(tower.lastUpgrade, "damage");

    e.upgradeRate();
    assert.equal(tower.rateLvl, 2);
    assert.equal(tower.upgradeBranch, "rate");
    assert.equal(tower.lastUpgrade, "rate");
    assert.ok(tower.upgradeT > 0);
    assert.equal(e.hud().formName, "Bound");
  });

  it("lets reach alone change form and grow sight", () => {
    const e = play();
    e.gold = 500;
    const grass = emptyGrass(e);
    e.tapCell(grass.c, grass.r);
    const tower = e.towers[0];
    const before = e.sightRange(tower);
    e.upgradeRange();
    assert.equal(tower.rangeLvl, 2);
    assert.equal(e.hud().formName, "Bound");
    assert.ok(e.sightRange(tower) > before);
    assert.equal(tower.upgradeBranch, "range");
    const text = JSON.parse(e.renderText()) as { selectedTower: { rangeLevel: number; form: string } };
    assert.equal(text.selectedTower.rangeLevel, 2);
    assert.equal(text.selectedTower.form, "Bound");
  });

  it("gives emberlit bows an extra pierce", () => {
    const e = play();
    e.gold = 900;
    const grass = emptyGrass(e);
    e.tapCell(grass.c, grass.r);
    const tower = e.towers[0];
    tower.dmgLvl = 4;
    tower.rateLvl = 4;
    e.notify();
    e.empowerSelected();
    e.spawn("grub");
    const grub = e.creeps[0];
    grub.x = grass.c + 0.5;
    grub.y = grass.r + 0.5;
    e.fire(tower, grub);
    const shot = e.shots[0];
    assert.ok(shot);
    assert.equal(shot.pierce, 3);
    assert.equal(shot.empowered, true);
  });

  it("keeps packet intent through rejected taps and clears it after a plant", () => {
    const e = play();
    e.chooseKind("mortar");
    const path = e.path[0];
    e.tapCell(path.c, path.r);
    assert.equal(e.selectedKind, "mortar");
    const grass = emptyGrass(e);
    e.tapCell(grass.c, grass.r);
    assert.equal(e.selectedKind, null);
    assert.equal(e.hud().bannerText, null);
  });

  it("refuses path, water, props, and occupied cells", () => {
    const e = play();
    const path = e.path[0];
    assert.equal(e.canBuild(path.c, path.r), false);
    const water = e.map.water[0];
    assert.equal(e.canBuild(water[0], water[1]), false);
    const prop = e.map.props[0];
    assert.equal(e.canBuild(prop.c, prop.r), false);
    const grass = emptyGrass(e);
    e.tapCell(grass.c, grass.r);
    assert.equal(e.canBuild(grass.c, grass.r), false);
  });

  it("explains why a placement tile is unavailable", () => {
    const e = play();
    const path = e.path[0];
    const water = e.map.water[0];
    const prop = e.map.props[0];

    assert.equal(e.buildReason(path.c, path.r), "Road tile — choose open grass");
    assert.equal(e.buildReason(water[0], water[1]), "Sealed ground — choose open grass");
    assert.equal(e.buildReason(prop.c, prop.r), "Sealed ground — choose open grass");
    assert.equal(e.buildReason(-1, 0), "Outside the field");

    const grass = emptyGrass(e);
    e.tapCell(grass.c, grass.r);
    assert.equal(e.buildReason(grass.c, grass.r), "Tower already stands here");
  });

  it("refunds a fraction of spent gold on sell", () => {
    const e = play();
    const grass = emptyGrass(e);
    e.tapCell(grass.c, grass.r);
    const spent = e.towers[0].spent;
    e.sellSelected();
    assert.equal(e.towers.length, 0);
    assert.equal(e.gold, START_GOLD - spent + Math.floor(spent * 0.7));
  });

  it("does not place or sell during shop or brief", () => {
    const e = play();
    const grass = emptyGrass(e);
    e.phase = "shop";
    e.gold = 400;
    e.tapCell(grass.c, grass.r);
    assert.equal(e.towers.length, 0);
    e.phase = "brief";
    e.tapCell(grass.c, grass.r);
    assert.equal(e.towers.length, 0);
  });

  it("buys a relic once and persists unlocks after a map hold", () => {
    const e = play();
    e.phase = "shop";
    e.gold = 200;
    e.buyRelic("purse");
    assert.equal(e.relics.has("purse"), true);
    const gold = e.gold;
    e.buyRelic("purse");
    assert.equal(e.gold, gold);
  });

  it("spawns creeps on the board, not off the gate", () => {
    const e = play();
    e.startWave();
    e.spawnQ = [];
    e.spawn("grub");
    const c = e.creeps[0];
    assert.ok(c.x >= 0 && c.x <= COLS);
    assert.ok(c.y >= 0 && c.y <= 9);
  });

  it("spawns the first wave and leaks a life when a creep reaches the keep", () => {
    const e = play();
    e.startWave();
    assert.equal(e.phase, "wave");
    assert.ok(e.spawnQ.length > 0);
    const start = e.waypoint(0);
    e.spawnQ = [];
    e.spawn("grub");
    const creep = e.creeps[0];
    creep.x = start.x;
    creep.y = start.y;
    creep.wp = e.path.length - 1;
    const keep = e.waypoint(e.path.length - 1);
    creep.x = keep.x;
    creep.y = keep.y;
    for (let i = 0; i < 90; i++) e.step(1 / 60);
    assert.ok(e.lives < START_LIVES);
  });

  it("clears a wave when the queue and creeps are empty", () => {
    const e = play();
    e.startWave();
    e.spawnQ = [];
    e.creeps = [];
    e.finishWaveIfClear();
    assert.equal(e.phase, "ready");
    assert.ok(e.gold > START_GOLD);
    assert.match(e.grade ?? "", new RegExp(`${e.gold}g`));
  });

  it("records a wave result and exposes deterministic text state", () => {
    const e = play();
    e.startWave();
    e.spawnQ = [];
    e.creeps = [];
    e.finishWaveIfClear();

    assert.deepEqual(e.hud().lastResult, {
      wave: 1,
      kills: 0,
      leaks: 0,
      earned: e.hud().lastResult?.earned,
      hold: "clean",
      orderHeld: true,
      orderPayout: 22,
      orderChain: 1,
    });
    assert.ok((e.hud().lastResult?.earned ?? 0) > 0);
    const text = JSON.parse(e.renderText()) as { coordinateSystem: string; phase: string; wave: { progress: number } };
    assert.match(text.coordinateSystem, /origin top-left/);
    assert.equal(text.phase, "ready");
    assert.equal(text.wave.progress, 100);
  });

  it("kills a grub with enough bow shots and pays bounty", () => {
    const e = play();
    const grass = emptyGrass(e);
    e.tapCell(grass.c, grass.r);
    e.startWave();
    e.spawnQ = [];
    e.creeps = [];
    e.spawn("grub");
    const creep = e.creeps[0];
    creep.x = grass.c + 0.5;
    creep.y = grass.r + 0.5;
    const gold = e.gold;
    for (let i = 0; i < 400; i++) e.step(1 / 60);
    assert.ok(e.gold > gold);
    assert.equal(e.creeps.some((c) => c.alive && c.kind === "grub"), false);
  });

  it("mortar cannot target wisps", () => {
    const e = play();
    e.phase = "ready";
    e.gold = 400;
    e.chooseKind("mortar");
    const grass = emptyGrass(e);
    e.tapCell(grass.c, grass.r);
    e.spawn("wisp");
    const wisp = e.creeps[0];
    wisp.x = grass.c + 0.5;
    wisp.y = grass.r + 0.5;
    const tower = e.towers[0];
    assert.equal(e.pickTarget(tower), null);
  });

  it("spark can target wisps", () => {
    const e = play();
    e.gold = 400;
    e.chooseKind("spark");
    const grass = emptyGrass(e);
    e.tapCell(grass.c, grass.r);
    e.spawn("wisp");
    const wisp = e.creeps[0];
    wisp.x = grass.c + 0.5;
    wisp.y = grass.r + 0.5;
    assert.equal(e.pickTarget(e.towers[0])?.id, wisp.id);
  });

  it("clamps a bad map index and will not march past the last stall", () => {
    const e = play();
    e.loadMap(99);
    assert.equal(e.mapIndex, MAPS.length - 1);
    e.phase = "shop";
    e.leaveShop();
    assert.equal(e.phase, "won");
  });

  it("watch cord raises the line bonus", () => {
    const e = play();
    e.gold = 400;
    const a = emptyGrass(e);
    e.tapCell(a.c, a.r);
    const neighbors = [
      { c: a.c + 1, r: a.r },
      { c: a.c - 1, r: a.r },
      { c: a.c, r: a.r + 1 },
      { c: a.c, r: a.r - 1 },
    ];
    const n = neighbors.find((p) => e.canBuild(p.c, p.r));
    assert.ok(n);
    e.chooseKind("bow");
    e.tapCell(n.c, n.r);
    e.relics.add("cord");
    assert.equal(e.lineBonus(e.towers[0]), 1.15);
  });

  it("adze cuts upgrade price and timber raises max lives", () => {
    const e = play();
    e.relics.add("adze");
    e.relics.add("timber");
    assert.equal(e.maxLives(), START_LIVES + 2);
    const raw = 27;
    assert.equal(e.upgradePrice(raw), Math.floor(raw * 0.82));
  });

  it("retry on a later map still pays the map stipend", () => {
    const e = play();
    e.loadMap(1);
    e.retryMap();
    e.dismissBrief();
    assert.equal(e.gold, e.startGold() + 40);
    assert.equal(e.mapIndex, 1);
  });

  it("line bonus grows for orthogonal neighbors", () => {
    const e = play();
    e.gold = 400;
    const a = emptyGrass(e);
    e.tapCell(a.c, a.r);
    const neighbors = [
      { c: a.c + 1, r: a.r },
      { c: a.c - 1, r: a.r },
      { c: a.c, r: a.r + 1 },
      { c: a.c, r: a.r - 1 },
    ];
    const n = neighbors.find((p) => e.canBuild(p.c, p.r));
    assert.ok(n);
    e.chooseKind("bow");
    e.tapCell(n.c, n.r);
    assert.equal(e.lineBonus(e.towers[0]), 1.1);
  });

  it("turns complementary neighbors into a combat bond", () => {
    const e = play();
    e.gold = 500;
    const first = emptyGrass(e);
    e.tapCell(first.c, first.r);
    const neighbors = [
      { c: first.c + 1, r: first.r },
      { c: first.c - 1, r: first.r },
      { c: first.c, r: first.r + 1 },
      { c: first.c, r: first.r - 1 },
    ];
    const neighbor = neighbors.find((p) => e.canBuild(p.c, p.r));
    assert.ok(neighbor);
    e.chooseKind("frost");
    e.tapCell(neighbor.c, neighbor.r);

    const bow = e.towers[0];
    const frost = e.towers[1];
    assert.equal(e.bondBetween(bow, frost)?.id, "windcut");
    assert.equal(e.bondFor(bow)?.partner, "frost");
    assert.equal(e.bondFor(frost)?.partner, "bow");
    assert.equal(e.bondMultiplier(bow), 1.08);
    assert.equal(e.hud().bond?.label, "Windcut");
    assert.equal(JSON.parse(e.renderText()).selectedTower.bond.id, "windcut");
  });

  it("horn spends gold, slows the road, and respects cooldown", () => {
    const e = play();
    e.startWave();
    e.spawn("grub");
    const gold = e.gold;
    e.blowHorn();
    assert.equal(e.gold, gold - 45);
    assert.ok(e.hornCd > 0);
    assert.ok(e.creeps[0].slowT > 0);
    const after = e.gold;
    e.blowHorn();
    assert.equal(e.gold, after);
  });

  it("undoes a fresh plant and refunds the full cost", () => {
    const e = play();
    const grass = emptyGrass(e);
    e.tapCell(grass.c, grass.r);
    assert.equal(e.canUndo(), true);
    e.undoLast();
    assert.equal(e.towers.length, 0);
    assert.equal(e.gold, START_GOLD);
  });

  it("charges extra lives for a lord leak", () => {
    assert.equal(leakCost("grub"), 1);
    assert.equal(leakCost("shell"), 2);
    assert.equal(leakCost("lord"), 3);
    const e = play();
    e.lives = 10;
    e.phase = "wave";
    e.spawn("lord");
    const creep = e.creeps[0];
    creep.wp = e.path.length - 1;
    const keep = e.waypoint(e.path.length - 1);
    creep.x = keep.x;
    creep.y = keep.y;
    for (let i = 0; i < 90; i++) e.step(1 / 60);
    assert.equal(e.lives, 7);
  });

  it("flags air on pine cut's opening wave", () => {
    assert.equal(planHasAir(MAPS[1].waves, 0), true);
    assert.equal(planHasAir(MAPS[0].waves, 0), false);
  });

  it("holds an air wave until an air-capable tower is ready", () => {
    const e = play();
    e.loadMap(1);
    e.clearField();
    e.gold = 500;
    e.startWave();
    assert.equal(e.phase, "ready");
    assert.match(e.hud().bannerText ?? "", /Air sightline needed/);

    const grass = emptyGrass(e);
    e.selectedKind = "bow";
    e.tapCell(grass.c, grass.r);
    e.startWave();
    assert.equal(e.phase, "wave");
  });

  it("applies the lantern aura to towers near a lamp", () => {
    const e = play();
    const lamp = e.map.props.find((prop) => prop.kind === "lamp");
    assert.ok(lamp);
    const spot = [{ c: lamp.c + 1, r: lamp.r }, { c: lamp.c - 1, r: lamp.r }, { c: lamp.c, r: lamp.r + 1 }].find((cell) => e.canBuild(cell.c, cell.r));
    assert.ok(spot);
    e.tapCell(spot.c, spot.r);
    const tower = e.towers[0];
    assert.equal(e.fieldRateMultiplier(tower), 1.18);
    assert.equal(e.hud().objective.complete, true);
  });

  it("makes spark the reach answer in pine fog", () => {
    const e = play();
    e.loadMap(1);
    e.phase = "ready";
    e.clearField();
    e.gold = 500;
    e.chooseKind("spark");
    const sparkSpot = emptyGrass(e);
    e.tapCell(sparkSpot.c, sparkSpot.r);
    const spark = e.towers[0];
    e.chooseKind("bow");
    const bowSpot = emptyGrass(e);
    e.tapCell(bowSpot.c, bowSpot.r);
    const bow = e.towers[1];
    assert.equal(e.fieldRangeMultiplier(spark), 1.12);
    assert.equal(e.fieldRangeMultiplier(bow), 0.9);
  });

  it("rewards a completed map objective", () => {
    const e = play();
    const lamp = e.map.props.find((prop) => prop.kind === "lamp");
    assert.ok(lamp);
    const spot = [{ c: lamp.c + 1, r: lamp.r }, { c: lamp.c - 1, r: lamp.r }, { c: lamp.c, r: lamp.r + 1 }].find((cell) => e.canBuild(cell.c, cell.r));
    assert.ok(spot);
    e.tapCell(spot.c, spot.r);
    e.phase = "wave";
    e.wave = e.map.waves.length;
    e.spawnQ = [];
    e.creeps = [];
    const before = e.gold;
    e.finishWaveIfClear();
    assert.equal(e.phase, "shop");
    assert.equal(e.gold - before, 70 + MAPS[0].profile.rule.reward);
  });

  it("horn oils the road", () => {
    const e = play();
    e.startWave();
    e.blowHorn();
    assert.ok(e.burns.length >= e.path.length);
  });

  it("keeps the horn reserved for live waves", () => {
    const e = play();
    const goldBefore = e.gold;

    e.blowHorn();

    assert.equal(e.gold, goldBefore);
    assert.equal(e.hornCd, 0);
  });

  it("clears timed hero guidance from the HUD when it expires", () => {
    const e = play();
    e.hero = { kind: "mend", who: "Brother Ash", line: "Keep the gate standing." };
    e.heroT = 0.01;
    e.notify();
    assert.ok(e.hud().hero);
    e.tick(1 / 60);
    assert.equal(e.hud().hero, null);
  });

  it("ford banks drag ground creeps but not wisps", () => {
    const e = play();
    e.loadMap(3);
    e.dismissBrief();
    const wet = e.map.water[0];
    assert.ok(e.fordSlow(wet[0] + 0.5, wet[1] + 0.5) < 1);
    const wisp = e.fordSlow(wet[0] + 0.5, wet[1] + 0.5);
    assert.equal(CREEPS.wisp.flying, true);
    assert.ok(wisp < 1);
    e.loadMap(2);
    assert.equal(e.fordSlow(4, 4), 1);
  });

  it("does not leak past zero lives", () => {
    const e = play();
    e.lives = 1;
    e.phase = "wave";
    e.spawn("grub");
    const creep = e.creeps[0];
    creep.wp = e.path.length - 1;
    const keep = e.waypoint(e.path.length - 1);
    creep.x = keep.x;
    creep.y = keep.y;
    for (let i = 0; i < 90; i++) e.step(1 / 60);
    assert.equal(e.phase, "lost");
    assert.equal(e.lives, 0);
  });
});

describe("creep stats", () => {
  it("gives high air to wisps and low air to moths", () => {
    for (const [kind, stats] of Object.entries(CREEPS)) {
      assert.equal(stats.flying, kind === "wisp" || kind === "moth");
      assert.equal(stats.low, kind === "moth");
      assert.ok(stats.hp > 0 && stats.speed > 0);
    }
  });
});

describe("watch depth", () => {
  it("marks a creep so towers prefer it over aim", () => {
    const e = play();
    e.gold = 400;
    const grass = emptyGrass(e);
    e.tapCell(grass.c, grass.r);
    e.towers[0].aim = "strong";
    e.spawn("grub");
    e.spawn("shaman");
    for (const c of e.creeps) {
      c.x = grass.c + 0.5;
      c.y = grass.r + 0.5;
    }
    const grub = e.creeps.find((c) => c.kind === "grub")!;
    e.markCreep(grub);
    assert.equal(e.pickTarget(e.towers[0])?.kind, "grub");
    assert.equal(e.hud().marked?.kind, "grub");
  });

  it("splinters a shell into a grub away from the gate", () => {
    const e = play();
    e.phase = "wave";
    e.spawn("shell");
    const shell = e.creeps[0];
    shell.wp = 1;
    e.damageCreep(shell, 999, 0, true);
    assert.equal(shell.alive, false);
    assert.equal(e.creeps.some((c) => c.alive && c.kind === "grub"), true);
  });

  it("does not splinter a shell already on the keep tile", () => {
    const e = play();
    e.phase = "wave";
    e.spawn("shell");
    const shell = e.creeps[0];
    shell.wp = e.path.length - 1;
    e.damageCreep(shell, 999, 0, true);
    assert.equal(e.creeps.some((c) => c.alive && c.kind === "grub"), false);
  });

  it("starts a hard watch with fewer lives and fatter creeps", () => {
    const e = new EmberEngine();
    e.setHard(true);
    e.startFromTitle();
    e.dismissBrief();
    e.reducedMotion = true;
    assert.equal(e.lives, HARD_LIVES);
    e.spawn("grub");
    assert.ok(e.creeps[0].hp > CREEPS.grub.hp);
  });

  it("kindred bows fire faster", () => {
    const e = play();
    e.gold = 400;
    const a = emptyGrass(e);
    e.tapCell(a.c, a.r);
    e.spawn("grub");
    const grub = e.creeps[0];
    grub.x = a.c + 0.5;
    grub.y = a.r + 0.5;
    e.fire(e.towers[0], grub);
    const alone = e.towers[0].cooldown;
    const neighbors = [
      { c: a.c + 1, r: a.r },
      { c: a.c - 1, r: a.r },
      { c: a.c, r: a.r + 1 },
      { c: a.c, r: a.r - 1 },
    ];
    const n = neighbors.find((p) => e.canBuild(p.c, p.r));
    assert.ok(n);
    e.chooseKind("bow");
    e.tapCell(n.c, n.r);
    e.fire(e.towers[0], grub);
    assert.ok(e.towers[0].cooldown < alone);
    assert.equal(e.hud().kindred, true);
  });

  it("keeps pike sealed until keep stair and lets mortar strike moths", () => {
    const e = play();
    e.chooseKind("pike");
    assert.equal(e.selectedKind, "bow");
    e.unlocked = 2;
    e.loadMap(2);
    e.chooseKind("pike");
    assert.equal(e.selectedKind, "pike");
    e.gold = 400;
    const grass = emptyGrass(e);
    e.tapCell(grass.c, grass.r);
    e.spawn("moth");
    const moth = e.creeps[0];
    moth.x = grass.c + 0.5;
    moth.y = grass.r + 0.5;
    e.chooseKind("mortar");
    const near = [
      { c: grass.c + 1, r: grass.r },
      { c: grass.c - 1, r: grass.r },
      { c: grass.c, r: grass.r + 1 },
      { c: grass.c, r: grass.r - 1 },
    ].find((p) => e.canBuild(p.c, p.r));
    assert.ok(near);
    e.tapCell(near.c, near.r);
    const mortar = e.towers.find((t) => t.kind === "mortar")!;
    assert.equal(e.canStrike(mortar, moth), true);
    assert.equal(e.pickTarget(mortar)?.kind, "moth");
  });

  it("counts mortar as cover for moths but not wisps", () => {
    const e = play();
    e.unlocked = 6;
    e.loadMap(6);
    e.clearField();
    e.phase = "ready";
    e.gold = 400;
    const mothPlan = e.map.waves[0];
    assert.equal(e.coversPreview(mothPlan).covered, false);
    const grass = emptyGrass(e);
    e.chooseKind("mortar");
    e.tapCell(grass.c, grass.r);
    assert.equal(e.coversPreview(mothPlan).covered, true);
    assert.equal(e.coversPreview(MAPS[1].waves[0]).covered, false);
  });

  it("unseals the pike when the keep stair brief is taken", () => {
    const e = play();
    e.unlocked = 2;
    e.loadMap(2);
    e.phase = "brief";
    e.dismissBrief();
    assert.match(e.banner?.text ?? "", /Pike/);
  });

  it("lets a knave dodge the first bite unless marked", () => {
    const e = play();
    e.phase = "wave";
    e.spawn("knave");
    const knave = e.creeps[0];
    const hp = knave.hp;
    e.damageCreep(knave, 40, 0, false);
    assert.equal(knave.hp, hp);
    assert.equal(knave.dodge, false);
    e.damageCreep(knave, 40, 0, false);
    assert.ok(knave.hp < hp);
  });
});
