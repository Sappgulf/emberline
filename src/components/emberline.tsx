import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { RotateCcw } from "lucide-react";
import { COLS, CREEPS, FORM_NAME, MAX_UPGRADE, ROWS, TOWERS, damageAt, rangeAt, rateAt, towerForm, type Aim, type CreepKind, type EmberlitBranch, type TowerKind } from "@/game/config";
import { relicUrl, routeMarkerUrl, spriteUrl } from "@/game/assets";
import { BESTIARY, RITES, type RelicId, type WatchRiteId } from "@/game/campaign";
import { EmberEngine, type HudSnap, type TowerUpgradeBranch } from "@/game/engine";
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
const COUNTER_ORDER: TowerKind[] = ["bow", "frost", "spark", "mortar", "bramble", "ward", "pike", "cinder"];
const COUNTERS: Record<CreepKind, TowerKind[]> = {
  grub: ["bow", "cinder"],
  runner: ["frost", "bramble"],
  shell: ["mortar", "bramble", "pike"],
  wisp: ["bow", "frost", "spark"],
  shaman: ["spark", "mortar"],
  hound: ["frost", "ward", "bramble"],
  lord: ["mortar", "spark", "pike"],
  moth: ["cinder", "pike", "mortar", "spark"],
  knave: ["frost", "bramble", "pike"],
  ashfang: ["frost", "ward", "bramble", "pike"],
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
  const campaignTriggerRef = useRef<HTMLButtonElement>(null);
  const codexTriggerRef = useRef<HTMLButtonElement>(null);
  const hallTriggerRef = useRef<HTMLButtonElement>(null);
  const hud = useHud();
  const [cell, setCell] = useState(40);
  const [hoverCell, setHoverCell] = useState<HoverCell | null>(null);
  const [codexTab, setCodexTab] = useState<"bestiary" | "chronicle">("bestiary");

  const restoreOverlayTrigger = useCallback((target: { current: HTMLButtonElement | null }) => {
    window.requestAnimationFrame(() => target.current?.focus());
  }, []);
  const closeCampaign = useCallback(() => {
    engine.toggleCampaign();
    restoreOverlayTrigger(campaignTriggerRef);
  }, [restoreOverlayTrigger]);
  const closeCodex = useCallback(() => {
    engine.toggleCodex();
    restoreOverlayTrigger(codexTriggerRef);
  }, [restoreOverlayTrigger]);
  const closeHall = useCallback(() => {
    engine.toggleHall();
    restoreOverlayTrigger(hallTriggerRef);
  }, [restoreOverlayTrigger]);
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
      if (e.key === "?" || e.key === "/") {
        e.preventDefault();
        engine.toggleHelp();
        return;
      }
      if (engine.help) {
        if (e.key === "Escape") engine.toggleHelp();
        return;
      }
      if (engine.hall) {
        if (e.key === "Escape") engine.toggleHall();
        return;
      }
      if (engine.codex) {
        if (e.key === "Escape") closeCodex();
        return;
      }
      if (engine.campaignOpen) {
        if (e.key === "Escape") {
          e.preventDefault();
          closeCampaign();
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
      if (e.key === "7") engine.chooseKind("pike");
      if (e.key === "8") engine.chooseKind("cinder");
      if (e.key === "h" || e.key === "H") engine.blowHorn();
      if (e.key === "m" || e.key === "M") engine.mendKeep();
      if (e.key === "q" || e.key === "Q") engine.upgradeDamage();
      if (e.key === "e" || e.key === "E") engine.upgradeRate();
      if (e.key === "r" || e.key === "R") engine.upgradeRange();
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
      if (e.key === "k" || e.key === "K") engine.scoutMark();
      if (e.key === "c" || e.key === "C") engine.useAbility();
      if (e.key === "g" || e.key === "G") {
        if (engine.phase === "title") engine.toggleHall();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeCampaign, closeCodex]);

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
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
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
  const hornValue = hud.phase !== "wave" ? "Wave" : hud.hornCd > 0 ? `${Math.ceil(hud.hornCd)}s` : hud.hornCost === 0 ? "Free" : `${hud.hornCost}g`;
  const stallHint = hud.wave < 1 ? "Stall opens after the first wave" : hud.phase !== "ready" ? "Stall opens between waves" : "Open roadside stall";
  const mendHint = hud.lives >= hud.maxLives ? "The keep is already at full strength" : hud.gold < hud.mendCost ? `Mend costs ${hud.mendCost} gold` : `Mend the keep for ${hud.mendCost} gold`;
  const mendValue = hud.lives >= hud.maxLives ? "Full" : `${hud.mendCost}g`;
  const waveProgressLabel = hud.phase === "wave" ? `Wave ${hud.wave}` : hud.wave > 0 ? `Wave ${hud.wave} held` : "First watch";
  const waveProgressStatus = hud.phase === "wave" ? `${hud.remaining} left` : hud.wave > 0 ? holdLabel(hud.lastResult?.hold) : "Ready";
  const placementToneValue = placementTone(engine, hud, hoverCell);
  const placementMessageValue = placementMessage(engine, hud, hoverCell);
  const firstWatch = hud.mapIndex === 0 && hud.wave === 0 && hud.relics.length === 0;
  const menu =
    hud.codex ||
    hud.campaign ||
    hud.help ||
    hud.hall ||
    hud.phase === "title" ||
    hud.phase === "brief" ||
    hud.phase === "shop" ||
    hud.phase === "stall" ||
    hud.phase === "won" ||
    hud.phase === "lost";

  const packets = Object.keys(TOWERS) as TowerKind[];
  const recommendedCounters = counterPlan(hud.wavePreview, hud.arsenal);

  return (
    <div
      className="game-shell relative flex h-dvh flex-col overflow-hidden bg-[#10140c] text-parchment"
      data-phase={hud.phase}
    >
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {hud.bannerText ?? ""}
      </p>
      <header className="watch-bar flex shrink-0 items-stretch" data-phase={hud.phase}>
        <div className="watch-title flex min-w-0 flex-1 flex-col justify-center px-4 py-2">
          <span className="watch-overline">Duskward watch</span>
          <p className="watch-map-name font-display text-xl leading-none text-copper">
            {hud.phase === "title" ? "Emberline" : hud.mapName}
            {hud.endless && <span className="ml-2 font-sans text-[10px] tracking-[0.18em] text-ember">LONG NIGHT</span>}
            {hud.hard && <span className="ml-2 font-sans text-[10px] tracking-[0.18em] text-ember">HARD</span>}
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
          <div className="watch-vitals">
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
            <div className="watch-stat" data-stat="lives" title="Lives">
              <img className="hud-ico" src="/ui/icon-heart.png" alt="" />
              <span className={`n ${hud.lives <= 5 ? "hurt" : ""}`}>{hud.lives}</span>
              <span className="u">lives</span>
            </div>
            <div className="watch-stat" data-stat="gold" title="Gold">
              <img className="hud-ico" src="/ui/icon-coin.png" alt="" />
              <span className="n gold">{hud.gold}</span>
              <span className="u">gold</span>
            </div>
            <div className="watch-stat" data-stat="wave" title="Wave">
              <img className="hud-ico" src="/ui/icon-wave.png" alt="" />
              <span className="n">
                {hud.phase === "wave" ? hud.remaining : `${hud.wave}/${hud.totalWaves}`}
              </span>
              <span className="u">{hud.phase === "wave" ? "left" : "wave"}</span>
            </div>
          </div>
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
          <button
            type="button"
            className="pressable packet px-2 py-1 text-[10px] text-dust"
            aria-label="How to watch"
            onClick={() => engine.toggleHelp()}
          >
            ?
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

      {!menu && <CampaignRail route={hud.route} />}

      <div className={`playfield-shell ${playing ? "playfield-shell-live" : ""}`}>
        {playing && (
          <WatchDesk hud={hud} hint={placementMessageValue} tone={placementToneValue} />
        )}
        <div
          ref={wrapRef}
          className="board-col playfield-wrap relative flex min-h-0 items-center justify-center overflow-hidden"
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
          {playing && hud.boss && (
            <div
              className="boss-bar"
              role="status"
              aria-live="polite"
              data-second={hud.boss.phase > 0}
              style={{ ["--boss-color" as string]: hud.boss.color }}
            >
              <span className="boss-kicker">Boss · {hud.boss.phase > 0 ? "second wind" : "first phase"}</span>
              <span className="boss-identity">
                <strong>{hud.boss.name}</strong>
                <small>{hud.boss.title}</small>
              </span>
              <span className="boss-track" aria-hidden="true">
                <span style={{ width: `${Math.max(0, Math.round((hud.boss.hp / Math.max(1, hud.boss.maxHp)) * 100))}%` }} />
              </span>
              <span className="boss-hp">
                {hud.boss.hp}/{hud.boss.maxHp}
              </span>
            </div>
          )}
        </div>
        {playing && (
          <div className="intel-stack intel-stack-dock" aria-label="Watch intelligence">
            <ThreatPanel
              hud={hud}
              onSelectCounter={(kind) => {
                unlockAudio();
                engine.chooseCounter(kind);
              }}
            />
            {hud.selectedTower && !hud.lastResult && <TowerIntel hud={hud} />}
          </div>
        )}
          {hud.codex && (
            <Overlay
              size="wide"
              kicker="Codex"
              title={codexTab === "bestiary" ? "Bestiary" : "Chronicle"}
              onClose={closeCodex}
              close="Close"
            >
              <div className="codex-tabs" role="tablist" aria-label="Codex sections">
                <button
                  type="button"
                  role="tab"
                  className="pressable codex-tab"
                  aria-selected={codexTab === "bestiary"}
                  onClick={() => setCodexTab("bestiary")}
                >
                  Bestiary
                </button>
                <button
                  type="button"
                  role="tab"
                  className="pressable codex-tab"
                  aria-selected={codexTab === "chronicle"}
                  onClick={() => setCodexTab("chronicle")}
                >
                  Chronicle
                  <span className="codex-tab-count">{hud.chronicle.filter((entry) => entry.unlocked).length}/{hud.chronicle.length}</span>
                </button>
              </div>
              {codexTab === "bestiary" ? (
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
              ) : (
                <div className="chronicle-grid w-full text-left">
                  {hud.chronicle.map((entry) => (
                    <article key={entry.id} className="chronicle-card plaque" data-locked={!entry.unlocked}>
                      <span className="intel-kicker">{entry.kicker}</span>
                      <strong>{entry.unlocked ? entry.title : "Sealed"}</strong>
                      <p>{entry.unlocked ? entry.body : "Walk more roads to open this page."}</p>
                    </article>
                  ))}
                </div>
              )}
            </Overlay>
          )}

          {hud.campaign && (
            <Overlay
              size="wide"
              surface="campaign"
              kicker="Campaign route"
              title="The ember watch"
              close="Close"
              onClose={closeCampaign}
              action={`Begin ${hud.mapName}`}
              onAction={() => engine.startSelectedMap()}
            >
              <div className="campaign-map-surface">
                <p className="max-w-md text-sm leading-relaxed text-dust">
                  {Math.min(hud.mapTotal, hud.unlocked + 1)} of {hud.mapTotal} routes available. Select an open route to choose where the next watch begins.
                </p>
                <p className="campaign-next-intel" aria-live="polite">
                  <span className="intel-kicker">Next road</span>
                  {hud.route[hud.unlocked + 1]
                    ? `Hold ${hud.route[hud.unlocked]?.name ?? "the current route"} to reveal ${hud.route[hud.unlocked + 1].name}.`
                    : "All eight roads are open. Replay a held route to chase a cleaner watch."}
                </p>
                <div className="campaign-select" aria-label="Campaign route selection">
                  {hud.route.map((node, index) => {
                    const locked = node.state === "locked";
                    const selected = index === hud.mapIndex;
                    const pressure = node.threatTier === "severe" ? "Severe pressure" : node.threatTier === "mixed" ? "Mixed pressure" : "Light pressure";
                    const routeIntel = locked
                      ? node.unlockHint
                      : `${node.waveCount} waves · ${pressure}${node.hasAir ? " · air threat" : ""}`;
                    return (
                      <button
                        key={node.id}
                        type="button"
                        disabled={locked}
                        data-selected={selected}
                        data-state={node.state}
                        className="campaign-card plaque pressable"
                        aria-label={`${node.name}, ${node.state === "current" ? "selected" : node.state}. ${routeIntel}`}
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
                          <span className="campaign-card-intel">{routeIntel}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </Overlay>
          )}

          {hud.help && (
            <Overlay kicker="Orders" title="How to watch" close="Close" onClose={() => engine.toggleHelp()} size="wide">
              <div className="orders-grid w-full text-left">
                {[
                  ["1–8", "Pick a packet. Pike unseals after Keep Stair; Cinder after River Ford."],
                  ["Click a creep", "Mark it. Towers focus and hit 18% harder. Beats a knave dodge."],
                  ["K scout", "Once a wave, mark the toughest body on the road."],
                  ["Q / E / R", "Forge damage, rate, or reach. Highest sets the form. X sell. Z undo."],
                  ["H / M / S", "Horn burns the road. Mend the keep. Stall after a wave."],
                  ["Space / P / F", "Send the wave. Pause. Cycle 1× / 2× / 3×."],
                  ["Line two", "Same kind +10% rate. Bonds: Windcut, Ashring, Stormroot, Brand."],
                  ["Rites", "At the brief: spare purse, spare timber, or first ember."],
                  ["Camp", "After a road, choose a preparation for the next one."],
                  ["Elites", "Some prey run shielded, frenzied, warded, or hollow. They pay more."],
                  ["Abilities", "C or the ability button unleashes the selected tower's power."],
                  ["Ashfangs", "The first bite howls. Nearby creeps run. Frost and Ward catch them."],
                  ["Lanterns", "Towers in the glow fire faster. Wick makes every road glow."],
                  ["Hard watch", "14 lives, tougher creeps, richer bounties. Shells splinter."],
                  ["Emberlit", "Crown a tower, then choose one of two awakenings for 70g."],
                  ["Watch hall", "Marks from held roads buy permanent perks. G opens it."],
                ].map(([k, v]) => (
                  <div key={k} className="plaque px-3 py-2">
                    <p className="text-[10px] tracking-[0.16em] text-copper uppercase">{k}</p>
                    <p className="mt-0.5 text-xs text-parchment">{v}</p>
                  </div>
                ))}
              </div>
            </Overlay>
          )}
          {hud.hall && (
            <Overlay kicker="Keep ledger" title="Watch hall" close="Close" onClose={closeHall} size="wide">
              <div className="hall-grid">
                <section className="hall-card plaque" aria-label="Watch marks">
                  <span className="intel-kicker">Watch marks</span>
                  <strong className="hall-marks">{hud.marks}</strong>
                  <p>
                    Marks are earned by holding roads, cutting bosses, and walking the Long Night. Spend them on permanent watch perks.
                  </p>
                </section>
                <section className="hall-card plaque" aria-label="Long Night">
                  <span className="intel-kicker">Long Night</span>
                  <strong>{hud.unlocked >= hud.mapTotal ? `Best night ${hud.bestEndless}` : "Sealed"}</strong>
                  {hud.unlocked >= hud.mapTotal ? (
                    <button
                      type="button"
                      className="pressable send-flag min-h-10 px-4 text-xs"
                      onClick={() => {
                        unlockAudio();
                        engine.startEndless();
                      }}
                    >
                      Walk the Long Night
                    </button>
                  ) : (
                    <p>Hold all eight roads to open the endless night.</p>
                  )}
                  <p>Every wave grows heavier. Bosses walk every fourth night.</p>
                </section>
              </div>
              <div className="hall-perks" aria-label="Watch perks">
                {hud.perkOptions.map((perk) => (
                  <article key={perk.id} className="hall-perk plaque" data-maxed={perk.tier >= perk.max}>
                    <div className="hall-perk-heading">
                      <span className="intel-kicker">{perk.name}</span>
                      <span className="hall-pips" aria-label={`${perk.tier} of ${perk.max} invested`}>
                        {Array.from({ length: perk.max }, (_, i) => (
                          <i key={i} data-on={i < perk.tier} />
                        ))}
                      </span>
                    </div>
                    <p>{perk.detail}</p>
                    <button
                      type="button"
                      className="pressable stamp min-h-9 px-3 text-[11px] text-copper disabled:opacity-40"
                      disabled={!perk.canBuy}
                      aria-label={perk.tier >= perk.max ? `${perk.name} fully invested` : `Invest in ${perk.name} for ${perk.cost} marks`}
                      onClick={() => engine.buyPerk(perk.id)}
                    >
                      {perk.tier >= perk.max ? "Fully invested" : `${perk.cost} marks`}
                    </button>
                  </article>
                ))}
              </div>
            </Overlay>
          )}

          {hud.phase === "title" && !hud.codex && !hud.campaign && !hud.help && !hud.hall && (
            <Overlay kicker="Keep watch" title="Emberline" emblem size="keep">
              <div className="keep-book">
                <div className="keep-main">
                  <p className="keep-lead">
                    Plant on grass. Forge damage, rate, or reach. Tap a creep to mark it. Hold {hud.mapTotal} roads until dawn.
                  </p>
                  <label className="keep-hard">
                    <input type="checkbox" checked={hud.hard} onChange={(e) => engine.setHard(e.target.checked)} className="accent-ember" />
                    Hard watch — 14 lives, tougher creeps, richer bounties
                  </label>
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
                    <button ref={campaignTriggerRef} type="button" className="pressable stamp min-h-11 px-5 text-sm text-copper" onClick={() => engine.toggleCampaign()}>
                      Campaign
                    </button>
                    <button ref={codexTriggerRef} type="button" className="pressable stamp min-h-11 px-5 text-sm text-dust" onClick={() => engine.toggleCodex()}>
                      Bestiary
                    </button>
                    <button type="button" className="pressable stamp min-h-11 px-5 text-sm text-dust" onClick={() => engine.toggleHelp()}>
                      Orders
                    </button>
                    <button ref={hallTriggerRef} type="button" className="pressable stamp hall-trigger min-h-11 px-5 text-sm text-copper" onClick={() => engine.toggleHall()}>
                      Watch hall
                      {hud.marks > 0 && <span className="hall-badge">{hud.marks}</span>}
                    </button>
                    {hud.unlocked >= hud.mapTotal && (
                      <button
                        type="button"
                        className="pressable stamp min-h-11 px-5 text-sm text-ember"
                        onClick={() => {
                          unlockAudio();
                          engine.startEndless();
                        }}
                      >
                        Long Night
                      </button>
                    )}
                  </div>
                  <p className="keep-whisper">“The road bends. The watch holds.” — Sera Venn, watch-captain</p>
                  <div className="keep-features" aria-label="Watch craft">
                    <span>
                      <b>Plant</b>Packets on grass, never the dirt.
                    </span>
                    <span>
                      <b>Forge</b>Power, tempo, or reach — highest sets the form.
                    </span>
                    <span>
                      <b>Bond</b>Pair towers for linked fire and richer lines.
                    </span>
                    <span>
                      <b>Hold</b>Read the forecast, then send the wave.
                    </span>
                  </div>
                </div>
                <div className="keep-side">
                  <KeepRouteBoard hud={hud} />
                  <KeepArsenal arsenal={hud.arsenal} />
                  <ol className="keep-steps" aria-label="How the watch works">
                    <li>
                      <b>1</b>
                      <span>
                        <strong>Choose a rite</strong>
                        <small>Purse, timber, or first ember at the brief.</small>
                      </span>
                    </li>
                    <li>
                      <b>2</b>
                      <span>
                        <strong>Plant the bends</strong>
                        <small>Packets on grass. Lanterns buy tempo.</small>
                      </span>
                    </li>
                    <li>
                      <b>3</b>
                      <span>
                        <strong>Send and mark</strong>
                        <small>K scouts the toughest. Horn if it frays.</small>
                      </span>
                    </li>
                  </ol>
                </div>
              </div>
            </Overlay>
          )}

          {hud.phase === "brief" && hud.story && (
            <Overlay
              size="wide"
              kicker={hud.story.role}
              title={hud.story.speaker}
              emblem
              action="Take the watch"
              onAction={() => engine.dismissBrief()}
              dimmer
            >
              <p className="max-w-2xl text-sm leading-relaxed text-parchment">{hud.story.line}</p>
              <p className="brief-route">
                <span className="intel-kicker">Road {hud.mapIndex + 1} of {hud.mapTotal}</span>
                {hud.route[hud.mapIndex]?.place ?? hud.mapName}
              </p>
              <FieldNote field={hud.field} markerId={hud.route[hud.mapIndex]?.id} />
              <RitePicker rite={hud.rite} />
              <BriefWave hud={hud} />
              {firstWatch && <BriefingSteps />}
              <p className="text-[11px] text-dust">Space also takes the watch.</p>
            </Overlay>
          )}

          {(hud.phase === "shop" || hud.phase === "stall") && (
            <Overlay
              size="wide"
              kicker="Brother Ash"
              title={hud.phase === "shop" ? "Night market" : "Roadside stall"}
              action={hud.phase === "shop" ? "March on" : "Back to the road"}
              onAction={() => (hud.phase === "shop" ? engine.leaveShop() : engine.closeStall())}
            >
              {hud.grade && <p className="text-xs text-ember">{hud.grade}</p>}
              <p className="text-sm text-dust">{hud.story?.line ?? `${hud.gold}g in the purse.`}</p>
              {hud.camp && (
                <section className="camp-panel" aria-label={`Camp: ${hud.camp.title}`}>
                  <div className="camp-heading">
                    <span className="intel-kicker">Camp · {hud.camp.title}</span>
                    <p>{hud.camp.detail}</p>
                  </div>
                  <div className="camp-options">
                    {hud.camp.options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className="pressable plaque camp-option"
                        aria-pressed={option.chosen}
                        aria-label={`${option.name}: ${option.blurb}`}
                        onClick={() => engine.chooseCamp(option.id)}
                      >
                        <span className="intel-kicker">{option.chosen ? "Ready" : "Prepare"}</span>
                        <strong>{option.name}</strong>
                        <small>{option.blurb}</small>
                      </button>
                    ))}
                  </div>
                </section>
              )}
              <div className="shop-board">
                <div className="shop-satchel" aria-label="Satchel">
                  <span className="intel-kicker">Satchel</span>
                  {hud.relicNames.length === 0 ? (
                    <p>Empty. Buy what the next road needs.</p>
                  ) : (
                    <ul>
                      {hud.relicNames.map((relic) => (
                        <li key={relic.id}>
                          <img src={relicUrl(relic.id)} alt="" />
                          {relic.name}
                        </li>
                      ))}
                    </ul>
                  )}
                  <strong>{hud.gold}g</strong>
                </div>
                {hud.sets.some((set) => set.active) && (
                  <div className="set-row" aria-label="Active relic sets">
                    <span className="intel-kicker">Sets</span>
                    {hud.sets
                      .filter((set) => set.active)
                      .map((set) => (
                        <span key={set.id} className="set-chip" title={set.detail}>
                          {set.name}
                        </span>
                      ))}
                  </div>
                )}
                <ShopList items={hud.shopItems} relics={hud.relics} gold={hud.gold} />
              </div>
            </Overlay>
          )}

          {hud.phase === "lost" && (
            <Overlay kicker={hud.endless ? "Long Night" : "Breach"} title={hud.endless ? "The night took the line" : "The keep fell"} emblem>
              {hud.endless ? (
                <p className="text-sm text-dust">
                  You held {hud.wave > 1 ? `${hud.wave - 1} full ${hud.wave - 1 === 1 ? "night" : "nights"}` : "no nights"} on {hud.mapName}. Best night: {hud.bestEndless}.
                </p>
              ) : (
                <p className="text-sm text-dust">
                  Wave {hud.wave} of {hud.totalWaves} reached the gate on {hud.mapName}. {hud.lives > 0 ? `${hud.lives} ${hud.lives === 1 ? "life" : "lives"} left in the keep.` : "The gate is open."}
                </p>
              )}
              {hud.story && <StoryLine story={hud.story} />}
              <div className="defeat-stats" aria-label="Watch state">
                <span>
                  <b>{hud.towerCount}</b> towers
                </span>
                <span>
                  <b>{hud.gold}g</b> in the purse
                </span>
                <span>
                  <b>{hud.endless ? hud.bestEndless : `${hud.wave}/${hud.totalWaves}`}</b> {hud.endless ? "best night" : "waves"}
                </span>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" className="pressable min-h-11 bg-copper px-6 text-sm font-semibold text-ink" onClick={() => engine.retryMap()}>
                  {hud.endless ? "Walk again" : "Hold this map"}
                </button>
                <Restart />
              </div>
            </Overlay>
          )}

          {hud.phase === "won" && (
            <Overlay kicker="Dawn" title="The line held" surface="dawn" emblem>
              {hud.story ? (
                <StoryLine story={hud.story} />
              ) : (
                <p className="text-sm text-dust">{hud.mapTotal} maps. Emberford still stands.</p>
              )}
              {hud.grade && <p className="text-xs text-ember">{hud.grade}</p>}
              <WatchSummary hud={hud} />
              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" className="pressable stamp min-h-11 px-5 text-sm text-copper" onClick={() => engine.keepRelics()}>
                  March again with relics
                </button>
                <button
                  type="button"
                  className="pressable send-flag min-h-11 px-5 text-sm"
                  onClick={() => {
                    unlockAudio();
                    engine.startEndless();
                  }}
                >
                  Walk the Long Night
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
            <div
              className="selected-tower-bar flex flex-wrap items-start gap-3"
              data-form={formKey(hud.selectedTower, hud.formName)}
              data-placement={hud.moving ? placementToneValue : "idle"}
              data-upgrade={hud.selectedTower.lastUpgrade ?? "none"}
            >
              <div className="selected-tower-copy flex-1">
                <div className="selected-tower-heading">
                  <p className="font-display text-lg leading-none text-copper">{TOWERS[hud.selectedTower.kind].name}</p>
                  <div className="selected-tower-tags" aria-label={`${hud.formName} form${hud.selectedTower.empowered ? ", Emberlit awakened" : ""}`}>
                    <span className="tower-form-chip" data-form={formKey(hud.selectedTower, hud.formName)}>{hud.formName}</span>
                    {hud.selectedTower.empowered && <span className="tower-ascension-chip">Emberlit</span>}
                    {hud.kindred && <span className="tower-form-chip">Kindred +10% rate</span>}
                    <span className="tower-form-chip" aria-label={`Power ${hud.selectedTower.dmgLvl}, tempo ${hud.selectedTower.rateLvl}, reach ${hud.selectedTower.rangeLvl}`}>
                      P{hud.selectedTower.dmgLvl} T{hud.selectedTower.rateLvl} R{hud.selectedTower.rangeLvl}
                    </span>
                    {hud.selectedTower.lastUpgrade && (
                      <span className="tower-upgrade-result" data-branch={hud.selectedTower.lastUpgrade} role="status" aria-live="polite">
                        {upgradeResultLabel(hud.selectedTower.lastUpgrade)}
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-1 max-w-lg text-[11px] text-dust">
                  {hud.moving ? (
                    placementMessageValue
                  ) : (
                    <>
                      {formBlurb(hud.selectedTower.kind, hud.formName, hud.selectedTower.empowered)}
                      {hud.bond && (
                        <span className="ml-2 text-frost">
                          Bond: {hud.bond.label} +{Math.round(hud.bond.bonus * 100)}%
                        </span>
                      )}
                      {playing && hud.phase === "ready" && <span className="ml-2 text-copper">Next: {hud.nextWave}</span>}
                    </>
                  )}
                </p>
              </div>
              <div className="selected-tower-actions grid grid-cols-2 gap-1 sm:grid-cols-6">
                <button
                  type="button"
                  className="pressable btn-wood upgrade-action upgrade-action-damage min-h-10 px-3 text-xs font-semibold disabled:opacity-40"
                  data-branch="damage"
                  disabled={!playing || hud.selectedTower.dmgLvl >= MAX_UPGRADE || hud.gold < hud.nextCosts.dmg}
                  aria-label={upgradeAriaLabel(hud, "damage", hud.nextCosts.dmg)}
                  title={upgradeAriaLabel(hud, "damage", hud.nextCosts.dmg)}
                  onClick={() => engine.upgradeDamage()}
                >
                  <span className="upgrade-main">Damage {hud.selectedTower.dmgLvl >= MAX_UPGRADE ? "max" : `${hud.nextCosts.dmg}g`}</span>
                  {hud.selectedTower.dmgLvl < MAX_UPGRADE && <span className="upgrade-preview">{upgradePreview(hud, "damage")}</span>}
                </button>
                <button
                  type="button"
                  className="pressable btn-wood upgrade-action upgrade-action-rate min-h-10 px-3 text-xs font-semibold disabled:opacity-40"
                  data-branch="rate"
                  disabled={!playing || hud.selectedTower.rateLvl >= MAX_UPGRADE || hud.gold < hud.nextCosts.rate}
                  aria-label={upgradeAriaLabel(hud, "rate", hud.nextCosts.rate)}
                  title={upgradeAriaLabel(hud, "rate", hud.nextCosts.rate)}
                  onClick={() => engine.upgradeRate()}
                >
                  <span className="upgrade-main">Rate {hud.selectedTower.rateLvl >= MAX_UPGRADE ? "max" : `${hud.nextCosts.rate}g`}</span>
                  {hud.selectedTower.rateLvl < MAX_UPGRADE && <span className="upgrade-preview">{upgradePreview(hud, "rate")}</span>}
                </button>
                <button
                  type="button"
                  className="pressable btn-wood upgrade-action upgrade-action-range min-h-10 px-3 text-xs font-semibold disabled:opacity-40"
                  data-branch="range"
                  disabled={!playing || hud.selectedTower.rangeLvl >= MAX_UPGRADE || hud.gold < hud.nextCosts.range}
                  aria-label={upgradeAriaLabel(hud, "range", hud.nextCosts.range)}
                  title={upgradeAriaLabel(hud, "range", hud.nextCosts.range)}
                  onClick={() => engine.upgradeRange()}
                >
                  <span className="upgrade-main">Reach {hud.selectedTower.rangeLvl >= MAX_UPGRADE ? "max" : `${hud.nextCosts.range}g`}</span>
                  {hud.selectedTower.rangeLvl < MAX_UPGRADE && <span className="upgrade-preview">{upgradePreview(hud, "range")}</span>}
                </button>
                <button
                  type="button"
                  className="pressable btn-wood ability-action min-h-10 px-3 text-xs font-semibold disabled:opacity-40"
                  disabled={!playing || !hud.ability?.ready}
                  aria-label={hud.ability ? `${hud.ability.name}: ${hud.ability.detail}${hud.ability.cd > 0 ? `, ready in ${hud.ability.cd} seconds` : ", ready"}` : "No tower selected"}
                  title={hud.ability ? `${hud.ability.name} — ${hud.ability.detail}` : "No tower selected"}
                  onClick={() => {
                    unlockAudio();
                    engine.useAbility();
                  }}
                >
                  <span className="upgrade-main">{hud.ability?.name ?? "Ability"}</span>
                  <span className="upgrade-preview">{hud.ability && hud.ability.cd > 0 ? `${hud.ability.cd}s` : hud.ability?.detail}</span>
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
              {hud.emberlitOptions && (
                <div className="emberlit-picker" role="group" aria-label="Choose an Emberlit awakening">
                  {([
                    ["a", hud.emberlitOptions.a],
                    ["b", hud.emberlitOptions.b],
                  ] as Array<[EmberlitBranch, { name: string; detail: string }]>).map(([branch, option]) => (
                    <button
                      key={branch}
                      type="button"
                      className="pressable send-flag emberlit-option min-h-10 px-3 text-xs font-semibold disabled:opacity-40"
                      data-branch={branch}
                      disabled={!playing || hud.gold < 70}
                      aria-label={`Awaken Emberlit ${option.name} for 70 gold: ${option.detail}`}
                      onClick={() => engine.empowerSelected(branch)}
                    >
                      <span className="upgrade-main">Emberlit · {option.name} 70g</span>
                      <span className="upgrade-preview">{option.detail}</span>
                    </button>
                  ))}
                </div>
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
            <div className="packet-row">
              {packets.map((kind, i) => {
                const def = TOWERS[kind];
                const seal = hud.arsenal.find((item) => item.kind === kind);
                const locked = seal ? !seal.unlocked : false;
                return (
                  <button
                    key={kind}
                    type="button"
                    disabled={!playing || locked}
                    data-on={hud.selectedKind === kind}
                    data-counter={!locked && recommendedCounters.includes(kind)}
                    aria-pressed={hud.selectedKind === kind}
                    aria-label={
                      locked
                        ? `${def.name} sealed. ${seal?.hint ?? ""}`
                        : `${def.name} tower, costs ${def.cost} gold${recommendedCounters.includes(kind) ? ", recommended counter" : ""}${hud.selectedKind === kind ? ", selected" : ""}`
                    }
                    title={locked ? seal?.hint : undefined}
                    onClick={() => {
                      unlockAudio();
                      engine.chooseKind(kind);
                    }}
                    data-sealed={locked}
                    className={`pressable packet ${locked || hud.gold < def.cost ? "opacity-40" : ""}`}
                  >
                    <span className="key">{i + 1}</span>
                    <img className="packet-sprite" src={spriteUrl(kind)} alt="" />
                    <span className="mt-1 block text-[12px] font-semibold">{def.short}</span>
                    <span className="packet-role">
                      {locked ? "Sealed" : kind === "pike" || kind === "cinder" ? "Low air" : def.hitsAir ? "Air" : "Ground"}
                    </span>
                    <span className="block text-[10px] text-copper">{locked ? "—" : `${def.cost}g`}</span>
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
                aria-label={hud.phase !== "wave" ? "Scout available during a wave" : hud.scoutReady ? "Scout marks the toughest creep" : "Scout already used this wave"}
                title={hud.phase !== "wave" ? "Scout during a wave" : hud.scoutReady ? "Scout the toughest" : "Scout spent"}
                disabled={hud.phase !== "wave" || !hud.scoutReady}
                onClick={() => {
                  unlockAudio();
                  engine.scoutMark();
                }}
              >
                <span className="command-label">Scout</span>
                <span className="command-value">
                  {hud.phase !== "wave" ? "Wave" : hud.scoutReady ? `Ready${hud.scoutsLeft > 1 ? ` ×${hud.scoutsLeft}` : ""}` : "Spent"}
                </span>
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
                <span className="command-value">{hud.wave < 1 ? "W1+" : hud.phase !== "ready" ? "Between" : "Open"}</span>
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
                  {hud.phase === "wave" ? "Wave active" : hud.airHint ? "Air check" : "Send wave"}
                </span>
                <span className="command-value">
                  {hud.phase === "wave" ? `${hud.remaining} left` : hud.airHint ? hud.airHint : hud.endless ? `Night ${hud.wave + 1}` : `Wave ${hud.wave + 1}`}
                </span>
              </button>
            </div>
          </div>
        </footer>
    </div>
  );
}

function formBlurb(kind: TowerKind, form: string, empowered = false) {
  if (empowered) {
    if (kind === "bow") return "Emberlit. Arrows pierce one extra creep.";
    if (kind === "mortar") return "Emberlit. Oil spreads wider and burns longer.";
    if (kind === "frost") return "Emberlit. Chill splashes and pins a beat.";
    if (kind === "spark") return "Emberlit. The bolt jumps one extra time.";
    if (kind === "ward") return "Emberlit. The ring cracks plate.";
    if (kind === "pike") return "Emberlit. The spear ignores plate.";
    if (kind === "cinder") return "Emberlit. Coals cling and burn longer.";
    return "Emberlit. Thorns root from the first timber.";
  }
  if (form === "Bound") return "The ring holds. A little more bite and reach.";
  if (form === "Tempered") {
    if (kind === "bow") return "Arrows pierce one creep behind the first.";
    if (kind === "mortar") return "Oil lasts longer on the dirt.";
    if (kind === "frost") return "Shots splash chill on a cluster.";
    if (kind === "spark") return "The bolt jumps once to a nearby creep.";
    if (kind === "ward") return "The ring chills harder.";
    if (kind === "pike") return "The spear pins the target.";
    if (kind === "cinder") return "The coal patch lasts.";
    return "Thorns root the target.";
  }
  if (form === "Crowned") {
    if (kind === "bow") return "Arrows pierce two creeps behind the first.";
    if (kind === "mortar") return "Wider oil, longer burn.";
    if (kind === "frost") return "Deep freeze splash.";
    if (kind === "spark") return "The bolt jumps twice.";
    if (kind === "ward") return "The ring holds a long chill.";
    if (kind === "pike") return "The spear cracks plate.";
    if (kind === "cinder") return "Wide clinging coals.";
    return "Long root.";
  }
  return "Green timber. Upgrade damage, rate, or reach to change form.";
}

function formKey(tower: NonNullable<HudSnap["selectedTower"]>, form: string) {
  return tower.empowered ? "emberlit" : form.toLowerCase();
}

function upgradeResultLabel(branch: TowerUpgradeBranch) {
  if (branch === "emberlit") return "Emberlit awakened";
  if (branch === "range") return "Reach tuned";
  return branch === "damage" ? "Power tuned" : "Tempo tuned";
}

type UpgradeBranch = "damage" | "rate" | "range";

function towerPower(
  hud: HudSnap,
  tower: NonNullable<HudSnap["selectedTower"]>,
  damageLevel = tower.dmgLvl,
  rateLevel = tower.rateLvl,
  rangeLevel = tower.rangeLvl,
) {
  const form = towerForm(damageLevel, rateLevel, rangeLevel);
  return Math.round(
    damageAt(tower.kind, damageLevel) *
      (hud.relics.includes("whet") ? 1.12 : 1) *
      (hud.relics.includes("ember") && tower.kind === "mortar" ? 1.2 : 1) *
      (1 + (form - 1) * 0.06) *
      (1 + (hud.setBonus?.damage ?? 0)) *
      hud.lineBonus *
      (1 + (hud.bond?.bonus ?? 0)) *
      (hud.fieldBoost?.damage ?? 1),
  );
}

function towerRate(hud: HudSnap, tower: NonNullable<HudSnap["selectedTower"]>, rateLevel = tower.rateLvl) {
  return rateAt(tower.kind, rateLevel) * (hud.fieldBoost?.rate ?? 1) * (1 + (hud.setBonus?.rate ?? 0));
}

function towerReach(hud: HudSnap, tower: NonNullable<HudSnap["selectedTower"]>, rangeLevel = tower.rangeLvl) {
  return (
    rangeAt(tower.kind, rangeLevel) *
    (hud.relics.includes("glass") ? 1.12 : 1) *
    (tower.empowered ? 1.18 : 1) *
    (hud.fieldBoost?.range ?? 1)
  );
}

function upgradePreview(hud: HudSnap, branch: UpgradeBranch) {
  const tower = hud.selectedTower;
  if (!tower) return "";
  const nextDamage = branch === "damage" ? tower.dmgLvl + 1 : tower.dmgLvl;
  const nextRate = branch === "rate" ? tower.rateLvl + 1 : tower.rateLvl;
  const nextRange = branch === "range" ? tower.rangeLvl + 1 : tower.rangeLvl;
  const currentForm = towerForm(tower.dmgLvl, tower.rateLvl, tower.rangeLvl);
  const nextForm = towerForm(nextDamage, nextRate, nextRange);
  const stat =
    branch === "damage"
      ? `P ${towerPower(hud, tower)}→${towerPower(hud, tower, nextDamage, nextRate, nextRange)}`
      : branch === "rate"
        ? `R ${towerRate(hud, tower).toFixed(1)}→${towerRate(hud, tower, nextRate).toFixed(1)}×`
        : `H ${towerReach(hud, tower).toFixed(1)}→${towerReach(hud, tower, nextRange).toFixed(1)}`;
  return nextForm === currentForm ? stat : `→ ${FORM_NAME[nextForm]} · ${stat}`;
}

function upgradeAriaLabel(hud: HudSnap, branch: UpgradeBranch, cost: number) {
  const tower = hud.selectedTower;
  if (!tower) return "Tower upgrade unavailable";
  const level = branch === "damage" ? tower.dmgLvl : branch === "rate" ? tower.rateLvl : tower.rangeLvl;
  const label = branch === "damage" ? "Damage" : branch === "rate" ? "Rate" : "Reach";
  if (level >= MAX_UPGRADE) {
    return `${label} upgrade maxed at ${FORM_NAME[towerForm(tower.dmgLvl, tower.rateLvl, tower.rangeLvl)]} form`;
  }
  const current =
    branch === "damage" ? towerPower(hud, tower) : branch === "rate" ? towerRate(hud, tower).toFixed(2) : towerReach(hud, tower).toFixed(2);
  const next =
    branch === "damage"
      ? towerPower(hud, tower, tower.dmgLvl + 1, tower.rateLvl, tower.rangeLvl)
      : branch === "rate"
        ? towerRate(hud, tower, tower.rateLvl + 1).toFixed(2)
        : towerReach(hud, tower, tower.rangeLvl + 1).toFixed(2);
  const currentForm = towerForm(tower.dmgLvl, tower.rateLvl, tower.rangeLvl);
  const nextForm = towerForm(
    branch === "damage" ? tower.dmgLvl + 1 : tower.dmgLvl,
    branch === "rate" ? tower.rateLvl + 1 : tower.rateLvl,
    branch === "range" ? tower.rangeLvl + 1 : tower.rangeLvl,
  );
  const formEffect = nextForm !== currentForm ? ` and advances the tower to ${FORM_NAME[nextForm]} form` : "";
  const stat = branch === "damage" ? "power" : branch === "rate" ? "fire rate" : "reach";
  const effect = `changes ${stat} from ${current} to ${next}${formEffect}`;
  return `Upgrade ${label.toLowerCase()} for ${cost} gold; ${effect}`;
}

function KeepRouteBoard({ hud }: { hud: HudSnap }) {
  return (
    <section className="keep-routes" aria-label="Campaign roads">
      <span className="intel-kicker">Eight roads</span>
      <ol>
        {hud.route.map((node, index) => (
          <li key={node.id} data-state={node.state}>
            <img src={routeMarkerUrl(node.id)} alt="" />
            <span>
              <small>{index + 1} · {node.state === "current" ? "Here" : node.state === "held" ? "Held" : node.state === "available" ? "Open" : "Sealed"}</small>
              <strong>{node.name}</strong>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function KeepArsenal({ arsenal }: { arsenal: HudSnap["arsenal"] }) {
  return (
    <section className="keep-arsenal" aria-label="Arsenal">
      <span className="intel-kicker">Packets</span>
      <ul>
        {arsenal.map((item) => (
          <li key={item.kind} data-sealed={!item.unlocked}>
            <img src={spriteUrl(item.kind)} alt="" />
            <span>{TOWERS[item.kind].short}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RitePicker({ rite }: { rite: WatchRiteId }) {
  return (
    <div className="rite-grid" role="radiogroup" aria-label="Watch rite">
      {RITES.map((item) => (
        <button
          key={item.id}
          type="button"
          className="pressable plaque rite-card"
          aria-pressed={rite === item.id}
          onClick={() => engine.chooseRite(item.id)}
        >
          <span className="intel-kicker">Rite</span>
          <strong>{item.name}</strong>
          <span>{item.blurb}</span>
        </button>
      ))}
    </div>
  );
}

function BriefWave({ hud }: { hud: HudSnap }) {
  return (
    <div className="brief-wave" aria-label={`First wave on ${hud.mapName}`}>
      <span className="intel-kicker">Wave {hud.previewWave}</span>
      <DeskWave items={hud.wavePreview} />
      <p>{hud.opening}</p>
    </div>
  );
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
        <span>
          <strong>{hud.marks}</strong>
          <small>Watch marks</small>
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
  mixed: "Mixed bodies. Cover armor, knaves, and low moths.",
  severe: "Heavy pressure ahead. Keep the horn ready.",
};

function DeskWave({ items }: { items: HudSnap["wavePreview"] }) {
  if (items.length === 0) return <p className="desk-empty">End of this road.</p>;
  return (
    <ul className="desk-wave">
      {items.map((item) => (
        <li key={item.kind}>
          <img src={spriteUrl(item.kind)} alt="" />
          <span>
            {item.count} {CREEPS[item.kind].name}
            {CREEPS[item.kind].low ? " · low" : CREEPS[item.kind].flying ? " · air" : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

function WatchDesk({ hud, hint, tone }: { hud: HudSnap; hint: string; tone: string }) {
  const sealed = hud.arsenal.filter((item) => !item.unlocked);
  const nextRoad = hud.route[hud.mapIndex + 1]?.name;
  return (
    <aside className="watch-desk" aria-label="Watch desk">
      <section className="desk-card" data-tone={tone}>
        <span className="intel-kicker">Opening</span>
        <p>{hud.opening || hint}</p>
        {hint && hint !== hud.opening && <p className="desk-meta">{hint}</p>}
        <p className="desk-meta">
          Scout · {hud.phase === "wave" ? (hud.scoutReady ? "K marks the toughest" : "spent this wave") : "ready on send"}
        </p>
      </section>
      <section className="desk-card">
        <span className="intel-kicker">This road</span>
        <strong>{hud.field.label}</strong>
        <p>{hud.field.detail}</p>
        <p className="desk-meta">
          {hud.objective.title} · {hud.objective.current}/{hud.objective.target}
          {hud.objective.complete ? " · held" : ` · +${hud.objective.reward}g`}
        </p>
        <p className="desk-meta">Rite · {hud.riteName}</p>
        {hud.campLabel && <p className="desk-meta">Camp · {hud.campLabel}</p>}
      </section>
      <section className="desk-card">
        <span className="intel-kicker">Now · wave {hud.previewWave}</span>
        <DeskWave items={hud.wavePreview} />
        {hud.thenPreview.length > 0 && (
          <>
            <span className="intel-kicker desk-then">Then · wave {hud.previewWave + 1}</span>
            <DeskWave items={hud.thenPreview} />
          </>
        )}
      </section>
      {hud.marked && (
        <section className="desk-card desk-mark">
          <span className="intel-kicker">Marked</span>
          <strong>{hud.marked.name}</strong>
          <p>
            {hud.marked.hp}/{hud.marked.maxHp} hp · leak {hud.marked.leak}
            {hud.marked.low ? " · low air" : hud.marked.flying ? " · air" : ""}
            {hud.marked.dodge ? " · first dodge" : ""}
          </p>
        </section>
      )}
      {hud.phase === "wave" && (
        <section className="desk-card">
          <span className="intel-kicker">This wave</span>
          <div className="desk-stats">
            <span>
              <b>{hud.waveKills}</b> cut
            </span>
            <span>
              <b>{hud.waveLeaks}</b> leaked
            </span>
            <span>
              <b>+{hud.waveEarned}g</b>
            </span>
            {hud.eliteCount > 0 && (
              <span>
                <b>{hud.eliteCount}</b> elite
              </span>
            )}
          </div>
        </section>
      )}
      <section className="desk-card">
        <span className="intel-kicker">Satchel</span>
        {hud.relicNames.length === 0 ? (
          <p>Empty. Buy at the stall after a wave.</p>
        ) : (
          <ul className="desk-relics">
            {hud.relicNames.map((relic) => (
              <li key={relic.id}>
                <img src={relicUrl(relic.id)} alt="" />
                {relic.name}
              </li>
            ))}
          </ul>
        )}
        {hud.sets.some((set) => set.active) && (
          <p className="desk-meta">Set · {hud.sets.filter((set) => set.active).map((set) => set.name).join(" · ")}</p>
        )}
        {sealed.length > 0 && (
          <p className="desk-meta">
            Sealed · {sealed.map((item) => TOWERS[item.kind].short).join(" · ")}
          </p>
        )}
      </section>
      {hud.towerCount >= 4 && <p className="desk-next">Overwatch · four towers tithe +1g</p>}
      {nextRoad && <p className="desk-next">Next road · {nextRoad}</p>}
    </aside>
  );
}

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

function ThreatPanel({ hud, onSelectCounter }: { hud: HudSnap; onSelectCounter: (kind: TowerKind) => void }) {
  const uncoveredAir = Boolean(hud.airHint);
  const counters = counterPlan(hud.wavePreview, hud.arsenal);
  const [intelOpen, setIntelOpen] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const sync = () => setIntelOpen(!media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (hud.phase === "wave" && window.matchMedia("(max-width: 900px)").matches) {
      setIntelOpen(false);
    }
  }, [hud.phase]);

  const intelDetailsId = `wave-intel-details-${hud.previewWave}`;
  return (
    <section
      className={`threat-panel threat-panel-${hud.threatTier}`}
      data-active={hud.phase === "wave"}
      data-expanded={intelOpen}
      aria-label={`Wave ${hud.previewWave} threat forecast`}
      role="region"
    >
      <div className="intel-heading">
        <span className="intel-kicker">Next threat</span>
        <span className={`threat-tier threat-${hud.threatTier}`}>{THREAT_LABEL[hud.threatTier]}</span>
        <button
          type="button"
          className="pressable intel-toggle"
          aria-controls={intelDetailsId}
          aria-expanded={intelOpen}
          onClick={() => setIntelOpen((open) => !open)}
        >
          {intelOpen ? "Hide details" : "Show details"}
        </button>
      </div>
      <div className="threat-title" aria-live="polite">
        <h2>
          {hud.endless ? `Night ${hud.previewWave}` : `Wave ${hud.previewWave}`}
          {hud.eliteCount > 0 && <span className="threat-elite"> · {hud.eliteCount} elite</span>}
        </h2>
        <span>{hud.phase === "wave" ? `${hud.remaining}/${hud.waveTotal} left` : "Ready to send"}</span>
      </div>
      {!intelOpen && hud.phase === "ready" && hud.lastResult && <CompactWaveRecap result={hud.lastResult} />}
      {!intelOpen && (
        <div className="intel-quick-actions" aria-label="Quick counter plan">
          <span className="intel-kicker">Counter</span>
          <CounterPills counters={counters} selectedKind={hud.selectedKind} onSelect={onSelectCounter} compact />
        </div>
      )}
      <div id={intelDetailsId} className="intel-details" hidden={!intelOpen}>
        {hud.phase === "ready" && hud.lastResult && <WaveRecap result={hud.lastResult} />}
        <FieldNote field={hud.field} compact markerId={hud.route[hud.mapIndex]?.id} />
        <FieldObjective objective={hud.objective} />
        <WatchOrder order={hud.watchOrder} />
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
                {creep.low && <span className="threat-tag">Low</span>}
                {creep.flying && !creep.low && <span className="threat-tag">Air</span>}
                {item.kind === "knave" && <span className="threat-tag">Dodge</span>}
                {item.kind === "ashfang" && <span className="threat-tag">Howl</span>}
                {!creep.flying && creep.armor > 0 && <span className="threat-tag">Armor</span>}
              </div>
            );
          })}
        </div>
        <div className="threat-tactics">
          <span className="intel-kicker">Counter plan</span>
          {counters.length === 0 ? (
            <p className="threat-note">Any packet holds this wave.</p>
          ) : (
            <CounterPills counters={counters} selectedKind={hud.selectedKind} onSelect={onSelectCounter} />
          )}
        </div>
        <p className={uncoveredAir ? "threat-note threat-note-alert" : "threat-note"}>
          {uncoveredAir ? hud.airHint : THREAT_NOTE[hud.threatTier]}
        </p>
      </div>
    </section>
  );
}

function CounterPills({
  counters,
  selectedKind,
  onSelect,
  compact = false,
}: {
  counters: TowerKind[];
  selectedKind: TowerKind | null;
  onSelect: (kind: TowerKind) => void;
  compact?: boolean;
}) {
  return (
    <div className={`counter-pills ${compact ? "counter-pills-quick" : ""}`}>
      {counters.map((kind) => (
        <button
          key={kind}
          type="button"
          className={`pressable counter-pill counter-${kind}`}
          aria-pressed={selectedKind === kind}
          aria-label={`Choose ${TOWERS[kind].name} as the counter for this wave`}
          title={`Choose ${TOWERS[kind].short} counter`}
          onClick={() => onSelect(kind)}
        >
          <img src={spriteUrl(kind)} alt="" />
          {TOWERS[kind].short}
        </button>
      ))}
    </div>
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

function WatchOrder({ order }: { order: HudSnap["watchOrder"] }) {
  if (!order) return null;
  const count = order.complete ? "Met" : order.id === "clean" ? "No breach" : `${order.current}/${order.target}`;
  const payout = order.payout;
  const status = order.complete
    ? `target met, paid ${payout} gold on clear`
    : order.id === "clean"
      ? `no breaches yet, payout ${payout} gold`
      : `${order.current} of ${order.target} complete, payout ${payout} gold`;
  return (
    <div
      className="watch-order"
      data-complete={order.complete}
      data-chain={order.chain > 0}
      aria-label={`Watch order: ${order.title}, ${status}`}
    >
      <div className="watch-order-heading">
        <span className="watch-order-identity">
          <span className="watch-order-seal" aria-hidden="true">
            <img src="/ui/emberline-crest-v1.png" alt="" />
          </span>
          <span className="intel-kicker">Watch order</span>
        </span>
        <span className="watch-order-count">{count}</span>
      </div>
      <strong>{order.title}</strong>
      <p>{order.detail}</p>
      <span className="watch-order-reward">
        {order.complete ? `On clear +${payout}g` : order.chain > 0 ? `Chain ${order.chain} · +${payout}g` : `Bonus +${payout}g`}
      </span>
    </div>
  );
}

function counterPlan(wave: HudSnap["wavePreview"], arsenal: HudSnap["arsenal"] = []): TowerKind[] {
  const needed = new Set<TowerKind>();
  for (const item of wave) {
    for (const kind of COUNTERS[item.kind]) needed.add(kind);
  }
  const open = new Set(arsenal.filter((item) => item.unlocked).map((item) => item.kind));
  const list = COUNTER_ORDER.filter((kind) => needed.has(kind) && (open.size === 0 || open.has(kind)));
  if (list.length > 0) return list.slice(0, 4);
  const fallback = COUNTER_ORDER.find((kind) => open.size === 0 || open.has(kind));
  return fallback ? [fallback] : ["bow"];
}

function WaveRecap({ result }: { result: NonNullable<HudSnap["lastResult"]> }) {
  const quality = holdLabel(result.hold);
  return (
    <div className="wave-recap" data-quality={result.hold} aria-label={`Wave ${result.wave} result: ${quality}`}>
      <div className="wave-recap-heading">
        <span className="intel-kicker">Last hold</span>
        <strong>{quality}</strong>
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
      <div className={`wave-recap-order ${result.orderHeld ? "" : "wave-recap-order-missed"}`}>
        {result.orderHeld
          ? `Order held · +${result.orderPayout}g · chain ${result.orderChain}`
          : "Order missed · chain reset"}
      </div>
    </div>
  );
}

function CompactWaveRecap({ result }: { result: NonNullable<HudSnap["lastResult"]> }) {
  const quality = holdLabel(result.hold);
  const breachLabel = result.leaks === 1 ? "breach" : "breaches";
  const orderLabel = result.orderHeld ? `Order +${result.orderPayout}g` : "Order missed";
  return (
    <div
      className="wave-recap-compact"
      data-quality={result.hold}
      aria-label={`Last hold: ${quality}. ${result.kills} cleared, ${result.leaks} ${breachLabel}. ${orderLabel}.`}
    >
      <span className="intel-kicker">Last hold</span>
      <strong>{quality}</strong>
      <span>{result.kills} cleared · {result.leaks} {breachLabel} · {orderLabel}</span>
    </div>
  );
}

function holdLabel(hold: string | undefined) {
  if (hold === "frayed") return "Line frayed";
  if (hold === "shaken") return "Keep shaken";
  return "Road clear";
}

function StoryLine({ story }: { story: NonNullable<HudSnap["story"]> }) {
  return (
    <blockquote className="story-line">
      <p>{story.line}</p>
      <cite>
        {story.speaker} · {story.role}
      </cite>
    </blockquote>
  );
}

function TowerIntel({ hud }: { hud: HudSnap }) {
  const tower = hud.selectedTower;
  if (!tower) return null;
  const def = TOWERS[tower.kind];
  const power = towerPower(hud, tower);
  const range = towerReach(hud, tower);
  const rate = towerRate(hud, tower);
  const bondText = hud.bond
    ? `Bonded with ${TOWERS[hud.bond.partner].short} · ${hud.bond.label} +${Math.round(hud.bond.bonus * 100)}% power`
    : "No bond · pair Windcut, Ashring, Stormroot, or Brand";
  return (
    <section className="tower-intel" aria-label={`${def.name} selected tower details`}>
      <div className="tower-intel-heading">
        <div>
          <span className="intel-kicker">Selected tower</span>
          <h2>{def.name}</h2>
        </div>
        <div className="tower-intel-tags">
          <span className="tower-form" data-form={formKey(tower, hud.formName)}>{hud.formName}</span>
          {tower.lastUpgrade && <span className="tower-intel-upgrade" data-branch={tower.lastUpgrade}>{upgradeResultLabel(tower.lastUpgrade)}</span>}
        </div>
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
      <p className="tower-intel-bond" data-active={Boolean(hud.bond)}>{bondText}</p>
      <p className="tower-intel-copy">{def.blurb}</p>
      <p className="tower-intel-path">Power {tower.dmgLvl} · Tempo {tower.rateLvl} · Reach {tower.rangeLvl} · {hud.field.rule.label}</p>
      <p className="tower-intel-meta">
        Aim {AIM_LABEL[hud.towerAim]} <span aria-hidden="true">·</span> Line +{Math.round((hud.lineBonus - 1) * 100)}%
      </p>
    </section>
  );
}

function Overlay({
  children,
  wide,
  size,
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
  size?: "card" | "wide" | "keep";
  kicker?: string;
  title?: string;
  action?: string;
  onAction?: () => void;
  close?: string;
  onClose?: () => void;
  dimmer?: boolean;
  emblem?: boolean;
  surface?: "campaign" | "dawn";
}) {
  const layout = size ?? (wide ? "wide" : "card");
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
        className={`overlay-in dispatch dispatch-${layout} ${surface === "campaign" ? "dispatch-campaign" : surface === "dawn" ? "dispatch-dawn" : ""} relative flex w-full max-h-[92dvh] flex-col ${layout === "keep" ? "items-stretch text-left" : "items-center text-center"} gap-3 overflow-y-auto`}
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
