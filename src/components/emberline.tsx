import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Coins, FastForward, Heart, Pause, Play, RotateCcw, ShieldPlus, Swords, Timer, Trash2, Volume2 } from "lucide-react";
import { COLS, CREEPS, MAX_UPGRADE, ROWS, TOWERS, type Aim, type TowerKind } from "@/game/config";
import { BESTIARY, type RelicId } from "@/game/campaign";
import { EmberEngine, type HudSnap } from "@/game/engine";
import { drawWorld } from "@/game/render";
import { loadSprites } from "@/game/sprites";
import { unlockAudio } from "@/game/audio";

const engine = new EmberEngine();
engine.readSave();
const AIMS: Aim[] = ["first", "last", "close", "strong"];
const AIM_LABEL: Record<Aim, string> = {
  first: "First",
  last: "Last",
  close: "Near",
  strong: "Tough",
};

function useHud(): HudSnap {
  return useSyncExternalStore(
    (cb) => engine.subscribe(cb),
    () => engine.hud(),
    () => engine.hud(),
  );
}

export function Emberline() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hud = useHud();
  const [cell, setCell] = useState(40);

  useEffect(() => {
    loadSprites();
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      engine.reducedMotion = mq.matches;
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "1") engine.chooseKind("bow");
      if (e.key === "2") engine.chooseKind("mortar");
      if (e.key === "3") engine.chooseKind("frost");
      if (e.key === "4") engine.chooseKind("spark");
      if (e.key === "5") engine.chooseKind("bramble");
      if (e.key === "h" || e.key === "H") engine.blowHorn();
      if (e.key === "m" || e.key === "M") engine.mendKeep();
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        if (engine.phase === "title") engine.startFromTitle();
        else if (engine.phase === "brief") engine.dismissBrief();
        else if (engine.phase === "shop") engine.leaveShop();
        else if (engine.phase === "stall") engine.closeStall();
        else engine.startWave();
      }
      if (e.key === "p" || e.key === "P") engine.togglePause();
      if (e.key === "f" || e.key === "F") engine.cycleSpeed();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const layout = () => {
      const rect = wrap.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) return;
      const next = Math.max(16, Math.floor(Math.min(rect.width / COLS, rect.height / ROWS)));
      setCell(next);
    };
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      engine.tick(dt);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = COLS * cell;
        const h = ROWS * cell;
        if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
          canvas.width = Math.floor(w * dpr);
          canvas.height = Math.floor(h * dpr);
          canvas.style.width = `${w}px`;
          canvas.style.height = `${h}px`;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawWorld(ctx, engine, cell, w, h);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cell]);

  const toCell = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return null;
    const ox = e.nativeEvent.offsetX;
    const oy = e.nativeEvent.offsetY;
    const x = Number.isFinite(ox) ? ox : e.clientX - rect.left;
    const y = Number.isFinite(oy) ? oy : e.clientY - rect.top;
    const c = Math.floor((x / rect.width) * COLS);
    const r = Math.floor((y / rect.height) * ROWS);
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return null;
    return { c, r };
  };

  const onMove = (e: React.PointerEvent) => {
    const pos = toCell(e);
    if (!pos) {
      engine.hoverC = -1;
      engine.hoverR = -1;
      return;
    }
    engine.hoverC = pos.c;
    engine.hoverR = pos.r;
  };

  const onTap = (e: React.PointerEvent) => {
    unlockAudio();
    const pos = toCell(e);
    if (!pos) return;
    engine.tapCell(pos.c, pos.r);
  };

  const playing = hud.phase === "ready" || hud.phase === "wave";
  const menu =
    hud.codex ||
    hud.phase === "title" ||
    hud.phase === "brief" ||
    hud.phase === "shop" ||
    hud.phase === "stall" ||
    hud.phase === "won" ||
    hud.phase === "lost";

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[radial-gradient(120%_80%_at_50%_-10%,#2a3524_0%,#12160f_52%)] text-parchment">
      <header className="flex shrink-0 items-center justify-between gap-2 px-3 py-1.5">
        <p className="min-w-0 truncate font-display text-lg text-copper">
          {hud.phase === "title" ? "Emberline" : hud.mapName}
        </p>
        <div className="flex items-center gap-1.5 text-sm">
          {hud.relics.length > 0 && (
            <span className="hidden rounded-full border border-line px-2 py-0.5 text-[10px] text-dust sm:inline">
              {hud.relics.length} relic{hud.relics.length === 1 ? "" : "s"}
            </span>
          )}
          <Stat icon={<Heart className="size-3.5 text-blood" />} label={`${hud.lives}`} hint="Lives" />
          <Stat icon={<Coins className="size-3.5 text-copper" />} label={`${hud.gold}`} hint="Gold" />
          <Stat icon={<Swords className="size-3.5 text-ember" />} label={`${hud.wave}/${hud.totalWaves}`} hint="Wave" />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col xl:flex-row xl:items-stretch xl:gap-3 xl:px-4 xl:pb-4">
        <div
          ref={wrapRef}
          className="relative mx-2 mt-1 flex aspect-[13/9] w-auto shrink-0 items-center justify-center overflow-hidden rounded-[14px] xl:mx-0 xl:mt-0 xl:aspect-auto xl:min-h-0 xl:flex-1"
        >
          <canvas
            ref={canvasRef}
            className="stage-frame touch-none xl:max-h-full"
            onPointerMove={onMove}
            onPointerDown={onTap}
            onPointerLeave={() => {
              engine.hoverC = -1;
              engine.hoverR = -1;
            }}
          />

          {hud.paused && playing && (
            <div className="pointer-events-none absolute inset-4 flex items-center justify-center">
              <p className="plaque rounded-full px-6 py-2 font-display text-2xl text-copper">Paused</p>
            </div>
          )}

          {playing && hud.hero && (
            <p className="pointer-events-none absolute left-2 top-2 z-10 max-w-[70%] rounded-full bg-ink/75 px-3 py-1 text-[11px] text-copper">
              {hud.hero.who}: {hud.hero.line}
            </p>
          )}
          {hud.codex && (
            <Overlay wide>
              <p className="text-[11px] uppercase tracking-[0.22em] text-dust">Codex</p>
              <h2 className="font-display text-2xl text-copper sm:text-3xl">Bestiary</h2>
              <div className="grid w-full grid-cols-1 gap-1.5 text-left sm:grid-cols-2">
                {BESTIARY.map((b) => (
                  <div key={b.kind} className="plaque rounded-xl p-3">
                    <p className="font-semibold">{CREEPS[b.kind].name}</p>
                    <p className="mt-1 text-xs text-dust">{b.weak}</p>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="pressable min-h-11 rounded-full bg-copper px-7 text-sm font-semibold text-ink"
                onClick={() => engine.toggleCodex()}
              >
                Close
              </button>
            </Overlay>
          )}

          {hud.phase === "title" && (
            <Overlay>
              <p className="text-[11px] uppercase tracking-[0.22em] text-dust">Keep watch</p>
              <h1 className="font-display text-4xl leading-none text-copper sm:text-5xl">Emberline</h1>
              <p className="max-w-sm text-sm leading-relaxed text-dust">
                Six towers. Four maps. Plant beside the road. Line two and they hit harder.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  className="pressable ember-glow min-h-11 rounded-full bg-copper px-7 py-2.5 text-sm font-semibold text-ink"
                  onClick={() => {
                    unlockAudio();
                    engine.startFromTitle();
                  }}
                >
                  Hold the line
                </button>
                {hud.unlocked > 0 && (
                  <button
                    type="button"
                    className="pressable min-h-11 rounded-full border border-copper px-6 text-sm text-copper"
                    onClick={() => {
                      unlockAudio();
                      engine.continueWatch();
                    }}
                  >
                    Continue watch
                  </button>
                )}
                <button
                  type="button"
                  className="pressable min-h-11 rounded-full border border-line px-5 text-sm text-dust"
                  onClick={() => engine.toggleCodex()}
                >
                  Bestiary
                </button>
              </div>
            </Overlay>
          )}

          {hud.phase === "brief" && hud.story && (
            <Overlay>
              <p className="text-[11px] uppercase tracking-[0.22em] text-dust">{hud.story.role}</p>
              <h2 className="font-display text-2xl text-copper sm:text-3xl">{hud.story.speaker}</h2>
              <p className="max-w-md text-sm leading-relaxed text-parchment">{hud.story.line}</p>
              <button
                type="button"
                className="pressable ember-glow min-h-11 rounded-full bg-copper px-7 py-2.5 text-sm font-semibold text-ink"
                onClick={() => engine.dismissBrief()}
              >
                Take the watch
              </button>
            </Overlay>
          )}

          {hud.phase === "shop" && (
            <Overlay wide>
              <p className="text-[11px] uppercase tracking-[0.22em] text-dust">Brother Ash · stall</p>
              <h2 className="font-display text-2xl text-copper sm:text-3xl">Night market</h2>
              {hud.grade && <p className="text-xs text-ember">{hud.grade}</p>}
              {hud.relics.length > 0 && (
                <p className="text-[11px] text-dust">Carrying {hud.relics.length} relic{hud.relics.length === 1 ? "" : "s"}.</p>
              )}
              <p className="max-w-md text-sm text-dust">{hud.story?.line}</p>
              <ShopList items={hud.shopItems} relics={hud.relics} gold={hud.gold} />
              <button
                type="button"
                className="pressable min-h-11 rounded-full bg-ember px-7 text-sm font-semibold text-ink"
                onClick={() => engine.leaveShop()}
              >
                March on
              </button>
            </Overlay>
          )}

          {hud.phase === "stall" && (
            <Overlay wide>
              <p className="text-[11px] uppercase tracking-[0.22em] text-dust">Brother Ash · roadside</p>
              <h2 className="font-display text-2xl text-copper sm:text-3xl">Stall</h2>
              <p className="text-sm text-dust">{hud.gold}g in the purse.</p>
              <ShopList items={hud.shopItems} relics={hud.relics} gold={hud.gold} />
              <button
                type="button"
                className="pressable min-h-11 rounded-full bg-copper px-7 text-sm font-semibold text-ink"
                onClick={() => engine.closeStall()}
              >
                Back to the road
              </button>
            </Overlay>
          )}

          {hud.phase === "lost" && (
            <Overlay>
              <h2 className="font-display text-3xl text-blood">The keep fell</h2>
              <p className="text-sm text-dust">Wave {hud.wave} reached the gate on {hud.mapName}.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  className="pressable flex min-h-11 items-center gap-2 rounded-full bg-copper px-6 text-sm font-semibold text-ink"
                  onClick={() => engine.retryMap()}
                >
                  Hold this map
                </button>
                <Restart />
              </div>
            </Overlay>
          )}

          {hud.phase === "won" && (
            <Overlay>
              <h2 className="font-display text-3xl text-copper">The line held</h2>
              {hud.grade && <p className="text-sm text-ember">{hud.grade}</p>}
              <p className="text-sm text-dust">Four maps. The keep and the ford still stand.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  className="pressable min-h-11 rounded-full border border-copper px-6 text-sm text-copper"
                  onClick={() => engine.keepRelics()}
                >
                  March again with relics
                </button>
                <Restart />
              </div>
            </Overlay>
          )}
        </div>

        <aside
          className={`dock z-20 shrink-0 flex-col gap-1.5 border-t border-line px-2 pt-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] xl:w-80 xl:overflow-y-auto xl:rounded-2xl xl:border xl:py-3 ${
            menu ? "hidden" : "flex"
          }`}
        >
          {hud.selectedTower && hud.nextCosts ? (
            <div className="flex flex-col gap-1.5">
              <p className="px-1 text-[11px] text-dust">
                {hud.formName} {TOWERS[hud.selectedTower.kind].name}
                {hud.selectedTower.empowered ? " · Emberlit" : ""}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                className="pressable min-h-10 rounded-xl bg-ember text-xs font-semibold text-ink disabled:opacity-40"
                disabled={!playing || hud.selectedTower.dmgLvl >= MAX_UPGRADE || hud.gold < hud.nextCosts.dmg}
                onClick={() => engine.upgradeDamage()}
              >
                Dmg {hud.selectedTower.dmgLvl >= MAX_UPGRADE ? "MAX" : `${hud.nextCosts.dmg}g`}
              </button>
              <button
                type="button"
                className="pressable min-h-10 rounded-xl bg-ember text-xs font-semibold text-ink disabled:opacity-40"
                disabled={!playing || hud.selectedTower.rateLvl >= MAX_UPGRADE || hud.gold < hud.nextCosts.rate}
                onClick={() => engine.upgradeRate()}
              >
                Rate {hud.selectedTower.rateLvl >= MAX_UPGRADE ? "MAX" : `${hud.nextCosts.rate}g`}
              </button>
              <button
                type="button"
                className="pressable min-h-10 rounded-xl border border-line text-xs text-dust"
                onClick={() => engine.sellSelected()}
              >
                Sell {Math.floor(hud.selectedTower.spent * 0.55)}g
              </button>
              <button
                type="button"
                className={`pressable min-h-10 rounded-xl border text-xs ${
                  hud.moving ? "border-copper bg-moss text-parchment" : "border-line text-dust"
                }`}
                disabled={!playing || hud.gold < hud.moveCost}
                onClick={() => engine.armMove()}
              >
                {hud.moving ? "Tap grass" : `Move ${hud.moveCost}g`}
              </button>
              {hud.formName === "Crowned" && !hud.selectedTower.empowered && (
                <button
                  type="button"
                  className="pressable col-span-2 min-h-11 rounded-xl bg-copper text-xs font-semibold text-ink disabled:opacity-40"
                  disabled={!playing || hud.gold < 70}
                  onClick={() => engine.empowerSelected()}
                >
                  Emberlit +range 70g
                </button>
              )}
            </div>
            </div>
          ) : hud.towerCount > 0 ? (
            <button
              type="button"
              className="pressable min-h-9 rounded-xl border border-line text-xs text-dust"
              onClick={() => engine.inspectLast()}
            >
              Tap next tower to upgrade
            </button>
          ) : (
            <p className="px-1 text-[11px] text-dust">
              {hud.lineBonus > 1
                ? `Watch line +${Math.round((hud.lineBonus - 1) * 100)}%`
                : "Pick a tower, tap grass beside the road."}
            </p>
          )}

          <div className="grid grid-cols-6 gap-1">
            {(Object.keys(TOWERS) as TowerKind[]).map((kind) => {
              const def = TOWERS[kind];
              const on = hud.selectedKind === kind;
              const broke = hud.gold < def.cost;
              return (
                <button
                  key={kind}
                  type="button"
                  disabled={!playing}
                  onClick={() => {
                    unlockAudio();
                    engine.chooseKind(kind);
                  }}
                  className={`pressable min-h-11 rounded-xl border px-1 py-1 text-center ${
                    on ? "border-copper bg-moss" : "border-line bg-ink/40"
                  } ${broke ? "opacity-45" : ""}`}
                >
                  <span className="block text-[11px] font-semibold">{def.short}</span>
                  <span className="block text-[10px] text-copper">{def.cost}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-6 gap-1">
            <button
              type="button"
              className="pressable min-h-9 rounded-xl border border-line text-[10px] text-dust"
              disabled={!playing}
              onClick={() => engine.setAim(AIMS[(AIMS.indexOf(hud.towerAim) + 1) % AIMS.length])}
            >
              {AIM_LABEL[hud.towerAim]}
            </button>
            <button
              type="button"
              className="pressable min-h-9 rounded-xl border border-line text-[10px] text-dust"
              disabled={!playing}
              onClick={() => engine.togglePause()}
            >
              {hud.paused ? "Go" : "Pause"}
            </button>
            <button
              type="button"
              className={`pressable min-h-9 rounded-xl border text-[10px] ${
                hud.speed !== 1 ? "border-copper bg-moss" : "border-line text-dust"
              }`}
              disabled={!playing}
              onClick={() => engine.cycleSpeed()}
            >
              {hud.speed === 1 ? "1×" : hud.speed === 2 ? "2×" : "3×"}
            </button>
            <button
              type="button"
              className="pressable min-h-9 rounded-xl border border-line text-[10px] text-dust disabled:opacity-40"
              disabled={!playing || hud.hornCd > 0 || hud.gold < hud.hornCost}
              onClick={() => {
                unlockAudio();
                engine.blowHorn();
              }}
            >
              {hud.hornCd > 0 ? `${Math.ceil(hud.hornCd)}s` : "Horn"}
            </button>
            <button
              type="button"
              className="pressable min-h-9 rounded-xl border border-line text-[10px] text-dust disabled:opacity-40"
              disabled={hud.phase !== "ready" || hud.wave < 1}
              onClick={() => engine.openStall()}
            >
              Shop
            </button>
            <button
              type="button"
              className="pressable min-h-9 rounded-xl border border-line text-[10px] text-dust disabled:opacity-40"
              disabled={(hud.phase !== "ready" && hud.phase !== "wave") || hud.lives >= hud.maxLives || hud.gold < hud.mendCost}
              onClick={() => {
                unlockAudio();
                engine.mendKeep();
              }}
            >
              Mend
            </button>
          </div>

          <button
            type="button"
            className="pressable ember-glow flex min-h-11 items-center justify-center gap-2 rounded-full bg-ember text-sm font-semibold text-ink disabled:opacity-35 disabled:shadow-none"
            disabled={hud.phase !== "ready" && !(hud.phase === "wave" && hud.remaining === 0)}
            onClick={() => {
              unlockAudio();
              engine.startWave();
            }}
          >
            <Timer className="size-4" />
            {hud.phase === "wave"
              ? `${hud.remaining} left`
              : `Send · ${hud.nextWave}`}
          </button>
        </aside>
      </div>
    </div>
  );
}

function formBlurb(kind: TowerKind, form: string) {
  if (form === "Bound") return "Ringed. Hits a little harder.";
  if (form === "Tempered") {
    if (kind === "bow") return "Arrows pierce once.";
    if (kind === "mortar") return "Oil burns longer.";
    if (kind === "frost") return "Shots splash cold.";
    if (kind === "spark") return "Bolt jumps once.";
    if (kind === "ward") return "Aura bites a crowd.";
    return "Thorns root.";
  }
  if (form === "Crowned") {
    if (kind === "bow") return "Arrows pierce twice.";
    if (kind === "mortar") return "Wide burning oil.";
    if (kind === "frost") return "Deep freeze splash.";
    if (kind === "spark") return "Bolt jumps twice.";
    if (kind === "ward") return "The cell crawls.";
    return "Long root.";
  }
  return "Fresh timber.";
}

function TowerMark({ kind }: { kind: TowerKind }) {
  const fill =
    kind === "bow" ? "bg-leaf" : kind === "mortar" ? "bg-ember" : kind === "frost" ? "bg-frost" : kind === "spark" ? "bg-copper" : kind === "ward" ? "bg-copper" : "bg-leaf";
  const shape = kind === "mortar" || kind === "spark" ? "rounded-full" : "rounded-[3px]";
  return <span className={`mx-auto block h-1.5 w-7 ${fill} ${shape}`} aria-hidden="true" />;
}

function Stat({ icon, label, hint }: { icon: React.ReactNode; label: string; hint: string }) {
  return (
    <div className="stat-chip flex min-h-11 min-w-16 items-center gap-1.5 rounded-full px-3" title={hint}>
      {icon}
      <span className="font-semibold tabular-nums">{label}</span>
    </div>
  );
}

function Overlay({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/75" />
      <div
        className={`overlay-in veil relative flex w-full ${wide ? "max-w-md" : "max-w-sm"} max-h-[80dvh] flex-col items-center gap-3 overflow-y-auto rounded-2xl border border-line px-4 py-5 text-center`}
      >
        {children}
      </div>
    </div>
  );
}

function ShopList({
  items,
  relics,
  gold,
}: {
  items: HudSnap["shopItems"];
  relics: RelicId[];
  gold: number;
}) {
  return (
    <div className="grid w-full grid-cols-2 gap-1.5 text-left">
      {items.map((item) => {
        const owned = relics.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            disabled={owned || gold < item.cost}
            onClick={() => engine.buyRelic(item.id)}
            className={`pressable plaque rounded-xl px-3 py-2.5 ${owned ? "opacity-45" : ""}`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-parchment">{item.name}</span>
              <span className="shrink-0 text-xs text-copper">{owned ? "Held" : `${item.cost}g`}</span>
            </span>
            <span className="mt-0.5 block text-[11px] leading-snug text-dust">{item.blurb}</span>
          </button>
        );
      })}
    </div>
  );
}

function Restart() {
  return (
    <button
      type="button"
      className="pressable flex min-h-11 items-center gap-2 rounded-full bg-copper px-6 text-sm font-semibold text-ink"
      onClick={() => {
        unlockAudio();
        engine.reset();
      }}
    >
      <RotateCcw className="size-4" />
      Watch again
    </button>
  );
}
