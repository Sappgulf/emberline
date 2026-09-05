import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { RotateCcw } from "lucide-react";
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
    const onVis = () => engine.hideTab(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      mq.removeEventListener("change", apply);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "1") engine.chooseKind("bow");
      if (e.key === "2") engine.chooseKind("mortar");
      if (e.key === "3") engine.chooseKind("frost");
      if (e.key === "4") engine.chooseKind("spark");
      if (e.key === "5") engine.chooseKind("bramble");
      if (e.key === "6") engine.chooseKind("ward");
      if (e.key === "h" || e.key === "H") engine.blowHorn();
      if (e.key === "m" || e.key === "M") engine.mendKeep();
      if (e.key === "q" || e.key === "Q") engine.upgradeDamage();
      if (e.key === "e" || e.key === "E") engine.upgradeRate();
      if (e.key === "x" || e.key === "X") engine.sellSelected();
      if (e.key === "z" || e.key === "Z") engine.undoLast();
      if (e.key === "Tab") {
        e.preventDefault();
        engine.inspectLast();
      }
      if (e.key === "Escape") {
        engine.chooseKind(null);
        engine.movingId = null;
        engine.selectedId = null;
        engine.notify();
      }
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
      if (e.key === "u" || e.key === "U") engine.toggleMute();
      if (e.key === "s" || e.key === "S") engine.openStall();
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

  const packets = Object.keys(TOWERS) as TowerKind[];

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#10140c] text-parchment">
      <header className="watch-bar flex shrink-0 items-stretch">
        <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-2">
          <p className="truncate font-display text-xl leading-none text-copper">
            {hud.phase === "title" ? "Emberline" : hud.mapName}
          </p>
          {hud.phase !== "title" && (
            <div className="mt-1.5 flex gap-1" aria-label={`Map ${hud.mapIndex + 1} of ${hud.mapTotal}`}>
              {Array.from({ length: hud.mapTotal }, (_, i) => (
                <span key={i} className="tick" data-on={i <= hud.mapIndex} />
              ))}
            </div>
          )}
        </div>
        <div className="watch-stat" title="Lives">
          <img className="hud-ico" src="/ui/icon-heart.png" alt="" />
          <span className={`n ${hud.lives <= 5 ? "hurt" : ""}`}>{hud.lives}</span>
          <span className="u">lives</span>
        </div>
        <div className="watch-stat" title="Gold">
          <img className="hud-ico" src="/ui/icon-coin.png" alt="" />
          <span className="n gold">{hud.gold}</span>
          <span className="u">gold</span>
        </div>
        <div className="watch-stat" title="Wave">
          <img className="hud-ico" src="/ui/icon-wave.png" alt="" />
          <span className="n">
            {hud.phase === "wave" ? hud.remaining : `${hud.wave}/${hud.totalWaves}`}
          </span>
          <span className="u">{hud.phase === "wave" ? "left" : "wave"}</span>
        </div>
        <div className="flex items-center gap-1 px-3">
          <button type="button" className="pressable packet px-2 py-1 text-[10px] text-dust" onClick={() => engine.toggleMute()}>
            {hud.muted ? "Muted" : "Sound"}
          </button>
          {playing && (
            <button type="button" className="pressable packet px-2 py-1 text-[10px] text-dust" onClick={() => engine.togglePause()}>
              {hud.paused ? "Resume" : "Pause"}
            </button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <div
          ref={wrapRef}
          className="relative mx-3 mt-2 flex min-h-0 flex-1 items-center justify-center overflow-hidden"
        >
          <canvas
            ref={canvasRef}
            className={`stage-frame touch-none xl:max-h-full ${hud.selectedKind ? "cursor-crosshair" : "cursor-pointer"}`}
            onPointerMove={onMove}
            onPointerDown={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                engine.setAim(AIMS[(AIMS.indexOf(engine.aim) + 1) % AIMS.length]);
                return;
              }
              if (e.button === 0) onTap(e);
            }}
            onAuxClick={(e) => {
              e.preventDefault();
              engine.setAim(AIMS[(AIMS.indexOf(engine.aim) + 1) % AIMS.length]);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              engine.chooseKind(null);
              engine.movingId = null;
              engine.selectedId = null;
              engine.notify();
            }}
            onPointerLeave={() => {
              engine.hoverC = -1;
              engine.hoverR = -1;
            }}
          />

          {hud.paused && playing && (
            <div className="pointer-events-none absolute inset-4 flex items-center justify-center">
              <p className="bg-ink/80 px-6 py-2 font-display text-2xl text-copper">Paused</p>
            </div>
          )}

          {playing && hud.hero && (
            <p className="pointer-events-none absolute left-2 top-2 z-10 max-w-[70%] bg-ink/80 px-3 py-1.5 text-[12px] text-copper">
              {hud.hero.who}: {hud.hero.line}
            </p>
          )}
          {hud.codex && (
            <Overlay wide kicker="Codex" title="Bestiary" onClose={() => engine.toggleCodex()} close="Close">
              <div className="grid w-full grid-cols-1 gap-1.5 text-left sm:grid-cols-2">
                {BESTIARY.map((b) => (
                  <div key={b.kind} className="plaque p-3">
                    <p className="font-semibold">{CREEPS[b.kind].name}</p>
                    <p className="mt-1 text-xs text-dust">{b.weak}</p>
                  </div>
                ))}
              </div>
            </Overlay>
          )}

          {hud.phase === "title" && (
            <Overlay kicker="Keep watch" title="Emberline">
              <p className="max-w-sm text-sm leading-relaxed text-dust">
                Plant on grass. Line two towers. Hold five maps until dawn. Space to begin.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  className="pressable send-flag min-h-11 px-7 text-sm"
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
                    className="pressable stamp min-h-11 px-5 text-sm text-copper"
                    onClick={() => {
                      unlockAudio();
                      engine.continueWatch();
                    }}
                  >
                    Continue
                  </button>
                )}
                <button type="button" className="pressable stamp min-h-11 px-5 text-sm text-dust" onClick={() => engine.toggleCodex()}>
                  Bestiary
                </button>
              </div>
            </Overlay>
          )}

          {hud.phase === "brief" && hud.story && (
            <Overlay
              kicker={hud.story.role}
              title={hud.story.speaker}
              action="Take the watch"
              onAction={() => engine.dismissBrief()}
              dimmer
            >
              <p className="max-w-md text-sm leading-relaxed text-parchment">{hud.story.line}</p>
              <p className="text-[11px] text-dust">Space also takes the watch.</p>
            </Overlay>
          )}

          {(hud.phase === "shop" || hud.phase === "stall") && (
            <Overlay
              wide
              kicker="Brother Ash"
              title={hud.phase === "shop" ? "Night market" : "Roadside stall"}
              action={hud.phase === "shop" ? "March on" : "Back to the road"}
              onAction={() => (hud.phase === "shop" ? engine.leaveShop() : engine.closeStall())}
            >
              {hud.grade && <p className="text-xs text-ember">{hud.grade}</p>}
              <p className="text-sm text-dust">{hud.story?.line ?? `${hud.gold}g in the purse.`}</p>
              <ShopList items={hud.shopItems} relics={hud.relics} gold={hud.gold} />
            </Overlay>
          )}

          {hud.phase === "lost" && (
            <Overlay kicker="Breach" title="The keep fell">
              <p className="text-sm text-dust">Wave {hud.wave} reached the gate on {hud.mapName}.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" className="pressable min-h-11 bg-copper px-6 text-sm font-semibold text-ink" onClick={() => engine.retryMap()}>
                  Hold this map
                </button>
                <Restart />
              </div>
            </Overlay>
          )}

          {hud.phase === "won" && (
            <Overlay kicker="Dawn" title="The line held">
              {hud.grade && <p className="text-xs text-ember">{hud.grade}</p>}
              <p className="text-sm text-dust">Five maps. Emberford still stands.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" className="pressable stamp min-h-11 px-5 text-sm text-copper" onClick={() => engine.keepRelics()}>
                  March again with relics
                </button>
                <Restart />
              </div>
            </Overlay>
          )}
        </div>

        <footer
          className={`tray z-20 shrink-0 flex-col gap-2 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] ${
            menu ? "hidden" : "flex"
          }`}
        >
          {hud.selectedTower && hud.nextCosts ? (
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-[12rem] flex-1">
                <p className="font-display text-lg leading-none text-copper">
                  {TOWERS[hud.selectedTower.kind].name}
                  <span className="ml-2 font-sans text-[11px] tracking-wide text-dust">
                    {hud.formName}
                    {hud.selectedTower.empowered ? " · Emberlit" : ""}
                  </span>
                </p>
                <p className="mt-1 max-w-lg text-[11px] text-dust">{formBlurb(hud.selectedTower.kind, hud.formName)}</p>
              </div>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                <button
                  type="button"
                  className="pressable btn-wood min-h-10 px-3 text-xs font-semibold disabled:opacity-40"
                  disabled={!playing || hud.selectedTower.dmgLvl >= MAX_UPGRADE || hud.gold < hud.nextCosts.dmg}
                  onClick={() => engine.upgradeDamage()}
                >
                  Damage {hud.selectedTower.dmgLvl >= MAX_UPGRADE ? "max" : `${hud.nextCosts.dmg}g`}
                </button>
                <button
                  type="button"
                  className="pressable btn-wood min-h-10 px-3 text-xs font-semibold disabled:opacity-40"
                  disabled={!playing || hud.selectedTower.rateLvl >= MAX_UPGRADE || hud.gold < hud.nextCosts.rate}
                  onClick={() => engine.upgradeRate()}
                >
                  Rate {hud.selectedTower.rateLvl >= MAX_UPGRADE ? "max" : `${hud.nextCosts.rate}g`}
                </button>
                <button type="button" className="pressable packet min-h-10 px-3 text-xs text-dust" onClick={() => engine.sellSelected()}>
                  Sell {hud.sellRefund}g
                </button>
                <button
                  type="button"
                  className="pressable packet min-h-10 px-3 text-xs text-dust disabled:opacity-40"
                  disabled={!playing || hud.gold < hud.moveCost}
                  onClick={() => engine.armMove()}
                >
                  {hud.moving ? "Tap grass" : `Move ${hud.moveCost}g`}
                </button>
              </div>
              {hud.formName === "Crowned" && !hud.selectedTower.empowered && (
                <button
                  type="button"
                  className="pressable send-flag min-h-10 px-4 text-xs font-semibold disabled:opacity-40"
                  disabled={!playing || hud.gold < 70}
                  onClick={() => engine.empowerSelected()}
                >
                  Emberlit 70g
                </button>
              )}
              {hud.canUndo && (
                <button type="button" className="text-[11px] text-copper" onClick={() => engine.undoLast()}>
                  Undo last plant
                </button>
              )}
            </div>
          ) : (
            <p className="max-w-2xl bg-ink/60 px-2 py-1 text-[11px] text-parchment">
              {hud.selectedKind ? TOWERS[hud.selectedKind].blurb : playing && hud.phase === "ready" ? `Next: ${hud.nextWave}` : "Pick a packet, plant on grass beside the road."}
            </p>
          )}

          <div className="flex flex-wrap items-end gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap gap-1">
              {packets.map((kind, i) => {
                const def = TOWERS[kind];
                return (
                  <button
                    key={kind}
                    type="button"
                    disabled={!playing}
                    data-on={hud.selectedKind === kind}
                    onClick={() => {
                      unlockAudio();
                      engine.chooseKind(kind);
                    }}
                    className={`pressable packet ${hud.gold < def.cost ? "opacity-40" : ""}`}
                  >
                    <span className="key">{i + 1}</span>
                    <TowerMark kind={kind} />
                    <span className="mt-1 block text-[12px] font-semibold">{def.short}</span>
                    <span className="block text-[10px] text-copper">{def.cost}g</span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <button type="button" className="pressable packet min-h-11 px-2 text-[11px] text-dust" disabled={!playing} onClick={() => engine.setAim(AIMS[(AIMS.indexOf(hud.towerAim) + 1) % AIMS.length])}>
                Aim {AIM_LABEL[hud.towerAim]}
              </button>
              <button type="button" className="pressable packet min-h-11 px-2 text-[11px] text-dust" disabled={!playing} onClick={() => engine.cycleSpeed()}>
                {hud.speed}×
              </button>
              <button
                type="button"
                className="pressable packet min-h-11 px-2 text-[11px] text-dust disabled:opacity-40"
                disabled={!playing || hud.hornCd > 0 || hud.gold < hud.hornCost}
                onClick={() => {
                  unlockAudio();
                  engine.blowHorn();
                }}
              >
                <img className="mx-auto mb-0.5 h-5 w-5 object-contain" src="/ui/icon-horn.png" alt="" />
                {hud.hornCd > 0 ? `${Math.ceil(hud.hornCd)}s` : hud.hornCost === 0 ? "Horn" : `${hud.hornCost}g`}
              </button>
              <button type="button" className="pressable packet min-h-11 px-2 text-[11px] text-dust disabled:opacity-40" disabled={hud.phase !== "ready" || hud.wave < 1} onClick={() => engine.openStall()}>
                Stall
              </button>
              <button
                type="button"
                className="pressable packet min-h-11 px-2 text-[11px] text-dust disabled:opacity-40"
                disabled={!playing || hud.lives >= hud.maxLives || hud.gold < hud.mendCost}
                onClick={() => {
                  unlockAudio();
                  engine.mendKeep();
                }}
              >
                Mend
              </button>
              <button
                type="button"
                className="pressable send-flag min-h-12 px-5 text-sm disabled:opacity-35"
                title={hud.nextWave}
                disabled={hud.phase !== "ready" && !(hud.phase === "wave" && hud.remaining === 0)}
                onClick={() => {
                  unlockAudio();
                  engine.startWave();
                }}
              >
                {hud.phase === "wave"
                  ? `${hud.remaining} left`
                  : hud.nextAir && !hud.airCovered
                    ? "Wisps — air tower"
                    : "Send wave"}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function formBlurb(kind: TowerKind, form: string) {
  if (form === "Bound") return "The ring holds. A little more bite and reach.";
  if (form === "Tempered") {
    if (kind === "bow") return "Arrows pierce one creep behind the first.";
    if (kind === "mortar") return "Oil lasts longer on the dirt.";
    if (kind === "frost") return "Shots splash chill on a cluster.";
    if (kind === "spark") return "The bolt jumps once to a nearby creep.";
    if (kind === "ward") return "The ring chills harder.";
    return "Thorns root the target.";
  }
  if (form === "Crowned") {
    if (kind === "bow") return "Arrows pierce two creeps behind the first.";
    if (kind === "mortar") return "Wider oil, longer burn.";
    if (kind === "frost") return "Deep freeze splash.";
    if (kind === "spark") return "The bolt jumps twice.";
    if (kind === "ward") return "The ring holds a long chill.";
    return "Long root.";
  }
  return "Green timber. Upgrade damage or rate to change form.";
}

function TowerMark({ kind }: { kind: TowerKind }) {
  const fill =
    kind === "bow" ? "bg-leaf" : kind === "mortar" ? "bg-ember" : kind === "frost" ? "bg-frost" : kind === "spark" ? "bg-copper" : kind === "ward" ? "bg-copper" : "bg-leaf";
  const shape = kind === "mortar" || kind === "spark" ? "rounded-full" : "rounded-[3px]";
  return <span className={`mx-auto block h-1.5 w-7 ${fill} ${shape}`} aria-hidden="true" />;
}

function Overlay({
  children,
  wide,
  kicker,
  title,
  action,
  onAction,
  close,
  onClose,
  dimmer,
}: {
  children?: React.ReactNode;
  wide?: boolean;
  kicker?: string;
  title?: string;
  action?: string;
  onAction?: () => void;
  close?: string;
  onClose?: () => void;
  dimmer?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/80"
        onClick={() => {
          if (dimmer && onAction) onAction();
        }}
      />
      <div
        className={`overlay-in dispatch relative flex w-full ${wide ? "max-w-lg" : "max-w-md"} max-h-[82dvh] flex-col items-center gap-3 overflow-y-auto px-8 py-8 text-center`}
      >
        <img className="wax" src="/ui/wax.png" alt="" />
        {kicker && <p className="dispatch-kicker">{kicker}</p>}
        {title && <h2 className="font-display text-4xl leading-none text-copper sm:text-[2.75rem]">{title}</h2>}
        {children}
        {action && onAction && (
          <button type="button" className="pressable send-flag min-h-11 px-7 text-sm" onClick={onAction}>
            {action}
          </button>
        )}
        {close && onClose && (
          <button type="button" className="pressable stamp min-h-11 px-6 text-sm text-dust" onClick={onClose}>
            {close}
          </button>
        )}
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
            className={`pressable plaque px-3 py-2.5 text-left ${owned ? "opacity-45" : ""}`}
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
      className="pressable flex min-h-11 items-center gap-2 bg-copper px-6 text-sm font-semibold text-ink"
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
