import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { RotateCcw } from "lucide-react";
import { COLS, CREEPS, MAX_UPGRADE, ROWS, TOWERS, damageAt, rangeAt, rateAt, towerForm, type Aim, type CreepKind, type TowerKind } from "@/game/config";
import { relicUrl, routeMarkerUrl, spriteUrl } from "@/game/assets";
import { BESTIARY, type RelicId } from "@/game/campaign";
import { EmberEngine, type HudSnap } from "@/game/engine";
import { drawWorld } from "@/game/render";
import { loadSprites } from "@/game/sprites";
import { unlockAudio } from "@/game/audio";

const engine = new EmberEngine();
const AIMS: Aim[] = ["first", "last", "close", "strong"];
const AIM_LABEL: Record<Aim, string> = {
  first: "First",
  last: "Last",
  close: "Near",
  strong: "Tough",
};
const COUNTER_ORDER: TowerKind[] = ["bow", "frost", "spark", "mortar", "bramble", "ward"];
const COUNTERS: Record<CreepKind, TowerKind[]> = {
  grub: ["bow"],
  runner: ["frost", "bramble"],
  shell: ["mortar", "bramble", "spark"],
  wisp: ["bow", "frost", "spark"],
  shaman: ["spark", "mortar"],
  hound: ["frost", "ward", "bramble"],
  lord: ["mortar", "spark", "bow"],
};

type HoverCell = { c: number; r: number };

function useHud(): HudSnap {
  return useSyncExternalStore(
    (cb) => engine.subscribe(cb),
    () => engine.hud(),
    () => engine.hud(),
  );
}

function placementMessage(engine: EmberEngine, hud: HudSnap, hover: HoverCell | null) {
  const playing = hud.phase === "ready" || hud.phase === "wave";
  if (!playing) return "";

  if (hud.moving) {
    const reason = hover ? engine.buildReason(hover.c, hover.r) : null;
    if (reason) return reason;
    if (hud.gold < hud.moveCost) return `Need ${hud.moveCost}g to move`;
    return hover ? `Move here · ${hud.moveCost}g` : "Move armed · tap a highlighted grass tile";
  }

  if (hud.selectedKind) {
    const def = TOWERS[hud.selectedKind];
    const reason = hover ? engine.buildReason(hover.c, hover.r) : null;
    if (reason) return reason;
    if (hud.gold < def.cost) return `Need ${def.cost}g for ${def.short}`;
    return hover ? `${def.short} · place here · ${def.cost}g` : `${def.short} ready · tap a highlighted grass tile`;
  }

  return hud.selectedTower ? "Tower selected · tap a tower to inspect or choose a packet" : "Pick a packet · highlighted grass shows safe tiles";
}

function placementTone(engine: EmberEngine, hud: HudSnap, hover: HoverCell | null) {
  if (hud.phase !== "ready" && hud.phase !== "wave") return "idle";
  if (!hud.selectedKind && !hud.moving) return "idle";
  const reason = hover ? engine.buildReason(hover.c, hover.r) : null;
  const cost = hud.moving ? hud.moveCost : hud.selectedKind ? TOWERS[hud.selectedKind].cost : 0;
  if (reason || hud.gold < cost) return "invalid";
  return hover ? "valid" : "armed";
}

export function Emberline() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const readyActionRef = useRef<HTMLButtonElement>(null);
  const hud = useHud();
  const [cell, setCell] = useState(40);
  const [hoverCell, setHoverCell] = useState<HoverCell | null>(null);

  useEffect(() => {
    if (hud.phase === "ready") readyActionRef.current?.focus();
  }, [hud.phase]);

  useEffect(() => {
    type GameWindow = Window & {
      render_game_to_text?: () => string;
      advanceTime?: (ms: number) => void;
    };
    const host = window as GameWindow;
    const previousRender = host.render_game_to_text;
    const previousAdvance = host.advanceTime;
    try {
      host.render_game_to_text = () => engine.renderText();
      host.advanceTime = (ms) => {
        if (!Number.isFinite(ms) || ms < 0) return;
        const steps = Math.max(1, Math.round((ms / 1000) * 60));
        for (let i = 0; i < steps; i += 1) engine.tick(1 / 60);
        engine.notify();
      };
    } catch {
      return;
    }
    return () => {
      if (host.render_game_to_text === previousRender) delete host.render_game_to_text;
      else host.render_game_to_text = previousRender;
      if (host.advanceTime === previousAdvance) delete host.advanceTime;
      else host.advanceTime = previousAdvance;
    };
  }, []);

  useEffect(() => {
    loadSprites();
    engine.readSave();
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
      if (engine.codex) {
        if (e.key === "Escape") engine.toggleCodex();
        return;
      }
      if (engine.campaignOpen) {
        if (e.key === "Escape") {
          e.preventDefault();
          engine.toggleCampaign();
        }
        return;
      }
      if (engine.phase === "brief" || engine.phase === "shop" || engine.phase === "stall" || engine.phase === "won" || engine.phase === "lost") {
        return;
      }
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
        if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLSelectElement) return;
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
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      engine.tick(dt);
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
      setHoverCell((current) => (current ? null : current));
      return;
    }
    engine.hoverC = pos.c;
    engine.hoverR = pos.r;
    setHoverCell((current) => (current?.c === pos.c && current?.r === pos.r ? current : pos));
  };

  const onTap = (e: React.PointerEvent) => {
    unlockAudio();
    const pos = toCell(e);
    if (!pos) return;
    engine.tapCell(pos.c, pos.r);
  };

  const playing = hud.phase === "ready" || hud.phase === "wave";
  const hornLabel = hud.phase !== "wave"
    ? "Horn available during a wave"
    : hud.hornCd > 0
      ? `Horn cooling down for ${Math.ceil(hud.hornCd)} seconds`
        : hud.hornCost === 0
        ? "Use free horn"
        : `Use horn for ${hud.hornCost} gold`;
  const hornValue = hud.phase !== "wave" ? "Wave only" : hud.hornCd > 0 ? `${Math.ceil(hud.hornCd)}s` : hud.hornCost === 0 ? "Free" : `${hud.hornCost}g`;
  const stallHint = hud.wave < 1 ? "Stall opens after the first wave" : hud.phase !== "ready" ? "Stall opens between waves" : "Open roadside stall";
  const stallValue = hud.wave < 1 ? "After wave 1" : hud.phase !== "ready" ? "Between waves" : "Open";
  const mendHint = hud.lives >= hud.maxLives ? "The keep is already at full strength" : hud.gold < hud.mendCost ? `Mend costs ${hud.mendCost} gold` : `Mend the keep for ${hud.mendCost} gold`;
  const mendValue = hud.lives >= hud.maxLives ? "Full" : `${hud.mendCost}g`;
  const waveProgressLabel = hud.phase === "wave" ? `Wave ${hud.wave}` : hud.wave > 0 ? `Wave ${hud.wave} held` : "First watch";
  const waveProgressStatus = hud.phase === "wave" ? `${hud.remaining} left` : hud.wave > 0 ? "Road clear" : "Ready";
  const placementToneValue = placementTone(engine, hud, hoverCell);
  const placementMessageValue = placementMessage(engine, hud, hoverCell);
  const firstWatch = hud.mapIndex === 0 && hud.wave === 0 && hud.relics.length === 0;
  const menu =
    hud.codex ||
    hud.campaign ||
    hud.phase === "title" ||
    hud.phase === "brief" ||
    hud.phase === "shop" ||
    hud.phase === "stall" ||
    hud.phase === "won" ||
    hud.phase === "lost";

  const packets = Object.keys(TOWERS) as TowerKind[];

  return (
    <div
      className="game-shell relative flex h-dvh flex-col overflow-hidden bg-[#10140c] text-parchment"
      data-phase={hud.phase}
    >
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {hud.bannerText ?? ""}
      </p>
      <header className="watch-bar flex shrink-0 items-stretch">
        <div className="watch-title flex min-w-0 flex-1 flex-col justify-center px-4 py-2">
          <span className="watch-overline">Duskward watch</span>
          <p className="watch-map-name font-display text-xl leading-none text-copper">
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
        {hud.phase !== "title" && (
          <>
            <div className="watch-progress" data-live={hud.phase === "wave"} aria-label={`${waveProgressLabel} progress`}>
              <div className="watch-progress-label">
                <span>{waveProgressLabel}</span>
                <span className="watch-progress-state">
                  {hud.phase === "wave" && <span className="watch-live-dot" aria-hidden="true" />}
                  {waveProgressStatus}
                </span>
              </div>
              <div
                className="watch-progress-track"
                role="progressbar"
                aria-label={`${waveProgressLabel} progress`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(hud.waveProgress * 100)}
              >
                <span style={{ width: `${Math.round(hud.waveProgress * 100)}%` }} />
              </div>
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
          </>
        )}
        <div className="watch-actions flex items-center gap-1 px-3">
          <button
            type="button"
            className="pressable packet px-2 py-1 text-[10px] text-dust"
            aria-pressed={hud.muted}
            aria-label={hud.muted ? "Turn sound on" : "Mute sound"}
            onClick={() => engine.toggleMute()}
          >
            {hud.muted ? "Muted" : "Sound"}
          </button>
          {playing && (
            <button
              type="button"
              className="pressable packet px-2 py-1 text-[10px] text-dust"
              aria-pressed={hud.paused}
              aria-label={hud.paused ? "Resume watch" : "Pause watch"}
              onClick={() => engine.togglePause()}
            >
              {hud.paused ? "Resume" : "Pause"}
            </button>
          )}
        </div>
      </header>

      {!hud.codex && <CampaignRail route={hud.route} />}

      <div className="flex min-h-0 flex-1 flex-col">
        <div
          ref={wrapRef}
          className="playfield-wrap relative mx-3 mt-2 flex min-h-0 flex-1 items-center justify-center overflow-hidden"
        >
          <canvas
            ref={canvasRef}
            className={`stage-frame touch-none xl:max-h-full ${hud.selectedKind ? "cursor-crosshair" : "cursor-pointer"}`}
            aria-label="Emberline tower defense board. Use number keys to choose a tower, then click grass beside the road to plant it."
            tabIndex={0}
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
              setHoverCell(null);
            }}
          />

          {hud.paused && playing && (
            <div className="pointer-events-none absolute inset-4 flex items-center justify-center" role="status" aria-live="polite">
              <div className="pause-plaque bg-ink/90 px-8 py-4 text-center">
                <p className="font-display text-2xl text-copper">Paused</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-dust">Press P or Resume</p>
              </div>
            </div>
          )}

          {playing && hud.hero && (
            <p
              className="pointer-events-none absolute left-2 top-2 z-10 max-w-[70%] bg-ink/80 px-3 py-1.5 text-[12px] text-copper"
              role="status"
              aria-live="polite"
            >
              {hud.hero.who}: {hud.hero.line}
            </p>
          )}
          {playing && hud.streak >= 4 && (
            <div className="streak-chip" role="status" aria-live="polite">
              <span className="streak-chip-kicker">Momentum</span>
              <strong>{hud.streak} streak</strong>
              <span>Every pair pays +3g</span>
            </div>
          )}
          {playing && (
            <div className="intel-stack" aria-label="Watch intelligence">
              <ThreatPanel hud={hud} />
              {hud.selectedTower && !hud.lastResult && <TowerIntel hud={hud} />}
            </div>
          )}
          {hud.codex && (
            <Overlay wide kicker="Codex" title="Bestiary" onClose={() => engine.toggleCodex()} close="Close">
              <div className="bestiary-grid w-full text-left">
                {BESTIARY.map((b) => {
                  const creep = CREEPS[b.kind];
                  return (
                    <article key={b.kind} className="bestiary-card plaque">
                      <div className="bestiary-art">
                        <img src={spriteUrl(b.kind)} alt="" />
                      </div>
                      <div className="bestiary-copy">
                        <div className="bestiary-heading">
                          <div>
                            <span className="intel-kicker">Field guide</span>
                            <p className="font-display text-lg leading-none text-copper">{creep.name}</p>
                          </div>
                          <span className="bestiary-role">{creep.flying ? "Air" : creep.armor > 0 ? "Armored" : "Ground"}</span>
                        </div>
                        <p className="mt-2 text-[11px] leading-snug text-dust">{b.weak}</p>
                        <div className="bestiary-counter-row">
                          <span className="intel-kicker">Counter</span>
                          <div className="counter-pills">
                            {COUNTERS[b.kind].slice(0, 3).map((kind) => (
                              <span key={kind} className={`counter-pill counter-${kind}`}>
                                <img src={spriteUrl(kind)} alt="" />
                                {TOWERS[kind].short}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </Overlay>
          )}

          {hud.campaign && (
            <Overlay
              wide
              surface="campaign"
              kicker="Campaign route"
              title="The ember watch"
              close="Close"
              onClose={() => engine.toggleCampaign()}
              action={`Begin ${hud.mapName}`}
              onAction={() => engine.startSelectedMap()}
            >
              <div className="campaign-map-surface">
                <p className="max-w-md text-sm leading-relaxed text-dust">
                  {Math.min(hud.mapTotal, hud.unlocked + 1)} of {hud.mapTotal} routes available. Select an open route to choose where the next watch begins.
                </p>
                <div className="campaign-select" aria-label="Campaign route selection">
                  {hud.route.map((node, index) => {
                    const locked = node.state === "locked";
                    const selected = index === hud.mapIndex;
                    return (
                      <button
                        key={node.id}
                        type="button"
                        disabled={locked}
                        data-selected={selected}
                        data-state={node.state}
                        className="campaign-card plaque pressable"
                        aria-label={`${node.name}, ${node.state === "current" ? "selected" : node.state}`}
                        onClick={() => engine.selectCampaignMap(index)}
                      >
                        <span className="campaign-card-marker" aria-hidden="true">
                          <img src={routeMarkerUrl(node.id)} alt="" />
                          <span>{index + 1}</span>
                        </span>
                        <span className="campaign-card-copy">
                          <span className="campaign-card-state">
                            {node.state === "current" ? "Selected" : node.state === "held" ? "Held" : node.state === "available" ? "Available" : "Locked"}
                          </span>
                          <strong>{node.name}</strong>
                          <span>{node.place}</span>
                          <small>{node.ruleLabel} · {node.objectiveTitle} · +{node.objectiveReward}g</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </Overlay>
          )}

          {hud.phase === "title" && !hud.codex && !hud.campaign && (
            <Overlay kicker="Keep watch" title="Emberline" emblem>
              <p className="max-w-sm text-sm leading-relaxed text-dust">
                Plant on grass. Line two towers. Hold five maps until dawn. Space to begin.
              </p>
              <WatchLedger hud={hud} />
              <div className="menu-actions">
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
                <button type="button" className="pressable stamp min-h-11 px-5 text-sm text-copper" onClick={() => engine.toggleCampaign()}>
                  Campaign
                </button>
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
              emblem
              action="Take the watch"
              onAction={() => engine.dismissBrief()}
              dimmer
            >
              <p className="max-w-md text-sm leading-relaxed text-parchment">{hud.story.line}</p>
              <FieldNote field={hud.field} markerId={hud.route[hud.mapIndex]?.id} />
              {firstWatch && <BriefingSteps />}
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
              <WatchSummary hud={hud} />
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
            <div className="selected-tower-bar flex flex-wrap items-start gap-3" data-placement={hud.moving ? placementToneValue : "idle"}>
              <div className="selected-tower-copy flex-1">
                <p className="font-display text-lg leading-none text-copper">
                  {TOWERS[hud.selectedTower.kind].name}
                  <span className="ml-2 font-sans text-[11px] tracking-wide text-dust">
                    · {hud.formName}
                    {hud.selectedTower.empowered ? " · Emberlit" : ""}
                  </span>
                </p>
                <p className="mt-1 max-w-lg text-[11px] text-dust">
                  {hud.moving ? (
                    placementMessageValue
                  ) : (
                    <>
                      {formBlurb(hud.selectedTower.kind, hud.formName)}
                      {playing && hud.phase === "ready" && <span className="ml-2 text-copper">Next: {hud.nextWave}</span>}
                    </>
                  )}
                </p>
              </div>
              <div className="selected-tower-actions grid grid-cols-2 gap-1 sm:grid-cols-4">
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
              <p className="tray-hint max-w-2xl" data-placement={placementToneValue} aria-live="polite">
              {hud.selectedKind ? (
                <>
                  <strong className="tray-hint-status">{placementMessageValue}</strong>
                  {playing && hud.phase === "ready" && <span className="ml-2 text-copper">Next: {hud.nextWave}</span>}
                </>
              ) : playing && hud.phase === "ready" ? (
                `Next: ${hud.nextWave}`
              ) : (
                "Pick a packet, plant on grass beside the road."
              )}
            </p>
          )}

          <div className="flex flex-wrap items-end gap-2">
            <div className="packet-row flex min-w-0 flex-1 flex-wrap gap-1">
              {packets.map((kind, i) => {
                const def = TOWERS[kind];
                return (
                  <button
                    key={kind}
                    type="button"
                    disabled={!playing}
                    data-on={hud.selectedKind === kind}
                    aria-pressed={hud.selectedKind === kind}
                    aria-label={`${def.name} tower, costs ${def.cost} gold${hud.selectedKind === kind ? ", selected" : ""}`}
                    onClick={() => {
                      unlockAudio();
                      engine.chooseKind(kind);
                    }}
                    className={`pressable packet ${hud.gold < def.cost ? "opacity-40" : ""}`}
                  >
                    <span className="key">{i + 1}</span>
                    <img className="packet-sprite" src={spriteUrl(kind)} alt="" />
                    <span className="mt-1 block text-[12px] font-semibold">{def.short}</span>
                    <span className="packet-role">{def.hitsAir ? "Air" : "Ground"}</span>
                    <span className="block text-[10px] text-copper">{def.cost}g</span>
                  </button>
                );
              })}
            </div>
            <div className="command-row flex flex-wrap items-center gap-1">
              <button
                type="button"
                className="pressable packet command-control min-h-11 px-2 text-[11px] text-dust"
                aria-label={`Tower targeting: ${AIM_LABEL[hud.towerAim]}. Activate to cycle targeting mode.`}
                title={`Targeting ${AIM_LABEL[hud.towerAim]}`}
                disabled={!playing}
                onClick={() => engine.setAim(AIMS[(AIMS.indexOf(hud.towerAim) + 1) % AIMS.length])}
              >
                <span className="command-label">Aim</span>
                <span className="command-value">{AIM_LABEL[hud.towerAim]}</span>
              </button>
              <button
                type="button"
                className="pressable packet command-control min-h-11 px-2 text-[11px] text-dust"
                aria-label={`Game speed ${hud.speed}x. Activate to cycle speed.`}
                title={`Game speed ${hud.speed}x`}
                disabled={!playing}
                onClick={() => engine.cycleSpeed()}
              >
                <span className="command-label">Pace</span>
                <span className="command-value">{hud.speed}×</span>
              </button>
              <button
                type="button"
                className="pressable packet command-control min-h-11 px-2 text-[11px] text-dust disabled:opacity-40"
                aria-label={hornLabel}
                title={hornLabel}
                disabled={hud.phase !== "wave" || hud.hornCd > 0 || hud.gold < hud.hornCost}
                onClick={() => {
                  unlockAudio();
                  engine.blowHorn();
                }}
              >
                <img className="command-icon" src="/ui/icon-horn.png" alt="" />
                <span className="command-label">Horn</span>
                <span className="command-value">{hornValue}</span>
              </button>
              <button
                type="button"
                className="pressable packet command-control min-h-11 px-2 text-[11px] text-dust disabled:opacity-40"
                aria-label={stallHint}
                title={stallHint}
                disabled={hud.phase !== "ready" || hud.wave < 1}
                onClick={() => engine.openStall()}
              >
                <span className="command-label">Stall</span>
                <span className="command-value">{stallValue}</span>
              </button>
              <button
                type="button"
                className="pressable packet command-control min-h-11 px-2 text-[11px] text-dust disabled:opacity-40"
                aria-label={mendHint}
                title={mendHint}
                disabled={!playing || hud.lives >= hud.maxLives || hud.gold < hud.mendCost}
                onClick={() => {
                  unlockAudio();
                  engine.mendKeep();
                }}
              >
                <span className="command-label">Mend</span>
                <span className="command-value">{mendValue}</span>
              </button>
              <button
                type="button"
                ref={readyActionRef}
                className={`pressable send-flag command-send min-h-12 px-5 text-sm disabled:opacity-35 ${hud.phase === "wave" ? "command-send-live" : ""}`}
                title={hud.nextWave}
                disabled={hud.phase !== "ready" && !(hud.phase === "wave" && hud.remaining === 0)}
                onClick={() => {
                  unlockAudio();
                  engine.startWave();
                }}
              >
                <span className="command-label">
                  {hud.phase === "wave" ? "Wave active" : hud.nextAir && !hud.airCovered ? "Air check" : "Send wave"}
                </span>
                <span className="command-value">
                  {hud.phase === "wave" ? `${hud.remaining} left` : hud.nextAir && !hud.airCovered ? "Choose Bow" : `Wave ${hud.wave + 1}`}
                </span>
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

function WatchLedger({ hud }: { hud: HudSnap }) {
  const nextRoute = hud.route[hud.unlocked]?.name;
  const relicLabel = hud.relics.length === 1 ? "relic" : "relics";
  return (
    <div className="watch-ledger" aria-label={`${hud.unlocked} of ${hud.mapTotal} routes held and ${hud.relics.length} ${relicLabel} carried`}>
      <div className="watch-ledger-stats">
        <span>
          <strong>{hud.unlocked}/{hud.mapTotal}</strong>
          <small>Routes held</small>
        </span>
        <span>
          <strong>{hud.relics.length}</strong>
          <small>Relics carried</small>
        </span>
      </div>
      <p>
        <span className="intel-kicker">Next road</span>
        {nextRoute ?? "All roads held"}
      </p>
    </div>
  );
}

function BriefingSteps() {
  return (
    <div className="briefing-steps" aria-label="First watch steps">
      <div className="briefing-steps-heading">
        <span className="intel-kicker">First watch</span>
        <span>Three moves</span>
      </div>
      <ol>
        <li>
          <b>1</b>
          <span><strong>Choose a packet</strong><small>Bow starts ready for this road.</small></span>
        </li>
        <li>
          <b>2</b>
          <span><strong>Tap open grass</strong><small>Highlighted tiles are safe to plant.</small></span>
        </li>
        <li>
          <b>3</b>
          <span><strong>Send the wave</strong><small>Read the count and hold the keep.</small></span>
        </li>
      </ol>
    </div>
  );
}

function WatchSummary({ hud }: { hud: HudSnap }) {
  return (
    <div className="watch-summary" aria-label="Dawn watch summary">
      <div>
        <span>Routes held</span>
        <strong>{hud.mapTotal}/{hud.mapTotal}</strong>
      </div>
      <div>
        <span>Relics carried</span>
        <strong>{hud.relics.length}</strong>
      </div>
      <div>
        <span>Final grade</span>
        <strong>{hud.grade?.split(" · ")[0] ?? "Dawn"}</strong>
      </div>
    </div>
  );
}

const THREAT_LABEL: Record<HudSnap["threatTier"], string> = {
  light: "Light pressure",
  mixed: "Mixed pressure",
  severe: "Heavy pressure",
};

const THREAT_NOTE: Record<HudSnap["threatTier"], string> = {
  light: "The road is quiet. Build for the bend.",
  mixed: "Mixed bodies on the road. Cover the air and armor.",
  severe: "Heavy pressure ahead. Keep the horn ready.",
};

function CampaignRail({ route }: { route: HudSnap["route"] }) {
  return (
    <nav className="campaign-rail" aria-label="Campaign watch route">
      <ol className="campaign-rail-list">
        {route.map((node, index) => (
          <li key={node.id} className="route-node" data-state={node.state} aria-current={node.state === "current" ? "step" : undefined}>
            <div className="route-marker" aria-hidden="true">
              <img src={routeMarkerUrl(node.id)} alt="" />
              <span>{index + 1}</span>
            </div>
            <div className="route-copy">
              <span className="route-state">{node.state === "current" ? "Current" : node.state === "held" ? "Held" : node.state === "available" ? "Next" : "Ahead"}</span>
              <span className="route-name">{node.name}</span>
              <span className="route-place">{node.place}</span>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function ThreatPanel({ hud }: { hud: HudSnap }) {
  const uncoveredAir = hud.nextAir && !hud.airCovered;
  const counters = counterPlan(hud.wavePreview);
  return (
    <section
      className={`threat-panel threat-panel-${hud.threatTier}`}
      data-active={hud.phase === "wave"}
      aria-label={`Wave ${hud.previewWave} threat forecast`}
      role="status"
    >
      <div className="intel-heading">
        <span className="intel-kicker">Next threat</span>
        <span className={`threat-tier threat-${hud.threatTier}`}>{THREAT_LABEL[hud.threatTier]}</span>
      </div>
      <div className="threat-title">
        <h2>Wave {hud.previewWave}</h2>
        <span>{hud.phase === "wave" ? `${hud.remaining}/${hud.waveTotal} left` : "Ready to send"}</span>
      </div>
      <FieldNote field={hud.field} compact markerId={hud.route[hud.mapIndex]?.id} />
      <FieldObjective objective={hud.objective} />
      <div className="threat-meter" data-tier={hud.threatTier} aria-hidden="true">
        <span />
      </div>
      <div className="threat-items">
        {hud.wavePreview.map((item) => {
          const creep = CREEPS[item.kind];
          return (
            <div key={item.kind} className="threat-item" aria-label={`${item.count} ${creep.name}${creep.flying ? ", flying" : ""}`}>
              <img src={spriteUrl(item.kind)} alt="" />
              <span className="threat-count">{item.count}</span>
              <span className="threat-name">{creep.name}</span>
              {creep.flying && <span className="threat-tag">Air</span>}
              {!creep.flying && creep.armor > 0 && <span className="threat-tag">Armor</span>}
            </div>
          );
        })}
      </div>
      <div className="threat-tactics">
        <span className="intel-kicker">Counter plan</span>
        <div className="counter-pills">
          {counters.map((kind) => (
            <span key={kind} className={`counter-pill counter-${kind}`}>
              <img src={spriteUrl(kind)} alt="" />
              {TOWERS[kind].short}
            </span>
          ))}
        </div>
      </div>
      <p className={uncoveredAir ? "threat-note threat-note-alert" : "threat-note"}>
        {uncoveredAir ? "Air sightline needed — choose Bow or Frost." : THREAT_NOTE[hud.threatTier]}
      </p>
      {hud.phase === "ready" && hud.lastResult && <WaveRecap result={hud.lastResult} />}
    </section>
  );
}

function FieldNote({ field, compact = false, markerId }: { field: HudSnap["field"]; compact?: boolean; markerId?: string }) {
  return (
    <div className={`field-note ${compact ? "field-note-compact" : ""}`} aria-label={`Field note: ${field.label}`}>
      <div className="field-note-art" aria-hidden="true">
        <img src={routeMarkerUrl(markerId ?? "low-road")} alt="" />
      </div>
      <div className="field-note-copy">
        <span className="intel-kicker">Field note</span>
        <strong>{field.label}</strong>
        <span>{field.detail}</span>
        <span className="field-rule-copy">{field.rule.label} · {field.rule.detail}</span>
      </div>
    </div>
  );
}

function FieldObjective({ objective }: { objective: HudSnap["objective"] }) {
  const progress = Math.round((objective.current / Math.max(1, objective.target)) * 100);
  return (
    <div className="field-objective" data-complete={objective.complete} aria-label={`Field objective: ${objective.title}`}>
      <div className="field-objective-heading">
        <div>
          <span className="intel-kicker">Field objective</span>
          <strong>{objective.title}</strong>
        </div>
        <span className="field-objective-count">{objective.current}/{objective.target}</span>
      </div>
      <p>{objective.detail}</p>
      <div className="objective-track" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
      <span className="field-objective-reward">
        {objective.complete ? "Objective secured" : `Reward +${objective.reward}g`}
      </span>
    </div>
  );
}

function counterPlan(wave: HudSnap["wavePreview"]): TowerKind[] {
  const needed = new Set<TowerKind>();
  for (const item of wave) {
    for (const kind of COUNTERS[item.kind]) needed.add(kind);
  }
  return COUNTER_ORDER.filter((kind) => needed.has(kind)).slice(0, 4);
}

function WaveRecap({ result }: { result: NonNullable<HudSnap["lastResult"]> }) {
  return (
    <div className="wave-recap" aria-label={`Wave ${result.wave} result`}>
      <div className="wave-recap-heading">
        <span className="intel-kicker">Last hold</span>
        <strong>Wave {result.wave} held</strong>
      </div>
      <div className="wave-recap-metrics">
        <span>
          <b>{result.kills}</b> cleared
        </span>
        <span className={result.leaks > 0 ? "recap-alert" : ""}>
          <b>{result.leaks}</b> {result.leaks === 1 ? "breach" : "breaches"}
        </span>
        <span>
          <b>+{result.earned}g</b> earned
        </span>
      </div>
    </div>
  );
}

function TowerIntel({ hud }: { hud: HudSnap }) {
  const tower = hud.selectedTower;
  if (!tower) return null;
  const def = TOWERS[tower.kind];
  const form = towerForm(tower.dmgLvl, tower.rateLvl);
  const power = Math.round(
    damageAt(tower.kind, tower.dmgLvl) *
      (hud.relics.includes("whet") ? 1.12 : 1) *
      (hud.relics.includes("ember") && tower.kind === "mortar" ? 1.2 : 1) *
      (1 + (form - 1) * 0.06) *
      hud.lineBonus *
      (hud.fieldBoost?.damage ?? 1),
  );
  const range =
    rangeAt(tower.kind, tower.dmgLvl) *
    (hud.relics.includes("glass") ? 1.12 : 1) *
    (tower.empowered ? 1.18 : 1) *
    (hud.fieldBoost?.range ?? 1);
  const rate = rateAt(tower.kind, tower.rateLvl) * (hud.fieldBoost?.rate ?? 1);
  return (
    <section className="tower-intel" aria-label={`${def.name} selected tower details`}>
      <div className="tower-intel-heading">
        <div>
          <span className="intel-kicker">Selected tower</span>
          <h2>{def.name}</h2>
        </div>
        <span className="tower-form">{hud.formName}</span>
      </div>
      <div className="tower-intel-body">
        <div className="tower-intel-art">
          <img src={spriteUrl(tower.kind)} alt="" />
        </div>
        <dl className="tower-stats">
          <div>
            <dt>Power</dt>
            <dd>{power}</dd>
          </div>
          <div>
            <dt>Rate</dt>
            <dd>{rate.toFixed(2)}×</dd>
          </div>
          <div>
            <dt>Reach</dt>
            <dd>{range.toFixed(1)}</dd>
          </div>
        </dl>
      </div>
      <p className="tower-intel-copy">{def.blurb}</p>
      <p className="tower-intel-path">Power {tower.dmgLvl} · Tempo {tower.rateLvl} · {hud.field.rule.label}</p>
      <p className="tower-intel-meta">
        Aim {AIM_LABEL[hud.towerAim]} <span aria-hidden="true">·</span> Line +{Math.round((hud.lineBonus - 1) * 100)}%
      </p>
    </section>
  );
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
  emblem,
  surface,
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
  emblem?: boolean;
  surface?: "campaign";
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusables = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
    focusables()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("keydown", onKeyDown);
    return () => {
      dialog.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title ?? kicker ?? "Emberline"}>
      <div
        className="veil absolute inset-0"
        onClick={() => {
          if (dimmer && onAction) onAction();
        }}
      />
      <div
        ref={dialogRef}
        className={`overlay-in dispatch ${surface === "campaign" ? "dispatch-campaign" : ""} relative flex w-full ${wide ? "max-w-lg" : "max-w-md"} max-h-[90dvh] flex-col items-center gap-3 overflow-y-auto px-8 py-8 text-center`}
      >
        {close && onClose && (
          <button type="button" className="pressable stamp overlay-close min-h-9 px-3 text-[10px] text-dust" onClick={onClose}>
            {close}
          </button>
        )}
        <img className={emblem ? "dispatch-crest" : "wax"} src={emblem ? "/ui/emberline-crest-v1.png" : "/ui/wax.png"} alt="" />
        {kicker && <p className="dispatch-kicker">{kicker}</p>}
        {title && <h2 className="font-display text-4xl leading-none text-copper sm:text-[2.75rem]">{title}</h2>}
        {children}
        {action && onAction && (
          <button type="button" className="pressable send-flag min-h-11 px-7 text-sm" onClick={onAction}>
            {action}
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
    <div className="grid w-full grid-cols-2 gap-1.5 text-left md:grid-cols-3">
      {items.map((item) => {
        const owned = relics.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            disabled={owned || gold < item.cost}
            onClick={() => engine.buyRelic(item.id)}
            aria-label={`${item.name}, ${owned ? "held" : `${item.cost} gold`}. ${item.blurb}`}
            className={`pressable plaque relic-card px-3 py-2.5 text-left ${owned ? "opacity-45" : ""}`}
            data-held={owned}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <img className="relic-mark" src={relicUrl(item.id)} alt="" aria-hidden="true" />
                <span className="truncate text-sm font-semibold text-parchment">{item.name}</span>
              </span>
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
