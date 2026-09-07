let ctx: AudioContext | null = null;
let muted = false;
let lastHit = 0;
let lastShot = 0;
let lastKill = 0;

export function setMuted(value: boolean) {
  muted = value;
  if (muted && ctx && ctx.state === "running") void ctx.suspend();
  if (!muted && ctx && ctx.state === "suspended") void ctx.resume();
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function unlockAudio() {
  ac();
}

function shotBeep(freq: number, dur: number, type: OscillatorType, gain: number, slide = 0) {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (now - lastShot < 40) return;
  lastShot = now;
  beep(freq, dur, type, gain, slide);
}

function beep(freq: number, dur: number, type: OscillatorType, gain: number, slide = 0) {
  if (muted) return;
  const audio = ac();
  if (!audio) return;
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), now + dur);
  g.gain.setValueAtTime(gain * 0.72, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(g);
  g.connect(audio.destination);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

export const sfx = {
  place: () => beep(220, 0.08, "triangle", 0.05),
  upgrade: () => {
    beep(300, 0.08, "triangle", 0.045, 80);
    setTimeout(() => beep(450, 0.1, "sine", 0.04, 100), 55);
  },
  shootBow: () => shotBeep(520, 0.05, "square", 0.03, -180),
  shootMortar: () => shotBeep(90, 0.12, "sawtooth", 0.05, -40),
  shootFrost: () => shotBeep(640, 0.07, "sine", 0.035, 80),
  shootSpark: () => shotBeep(880, 0.06, "square", 0.04, -320),
  shootBramble: () => shotBeep(210, 0.04, "triangle", 0.03, 40),
  horn: () => {
    beep(160, 0.22, "sawtooth", 0.06, 80);
    setTimeout(() => beep(220, 0.18, "triangle", 0.05), 80);
  },
  hit: () => {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - lastHit < 45) return;
    lastHit = now;
    beep(180, 0.04, "square", 0.025);
  },
  kill: () => {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - lastKill < 70) return;
    lastKill = now;
    beep(340, 0.1, "triangle", 0.05, 220);
  },
  combo: () => beep(520, 0.12, "triangle", 0.045, 180),
  boss: () => {
    beep(78, 0.24, "sawtooth", 0.055, -12);
    setTimeout(() => beep(116, 0.2, "triangle", 0.05, -18), 100);
  },
  leak: () => beep(110, 0.22, "sawtooth", 0.07, -70),
  wave: () => beep(280, 0.16, "triangle", 0.05, 160),
  waveClear: () => {
    beep(330, 0.12, "triangle", 0.045, 90);
    setTimeout(() => beep(495, 0.16, "triangle", 0.05, 120), 90);
  },
  objective: () => {
    beep(440, 0.1, "triangle", 0.045, 80);
    setTimeout(() => beep(660, 0.14, "sine", 0.05, 120), 85);
  },
  win: () => {
    beep(392, 0.18, "triangle", 0.06);
    setTimeout(() => beep(523, 0.22, "triangle", 0.06), 140);
    setTimeout(() => beep(659, 0.28, "triangle", 0.07), 280);
  },
  lose: () => beep(90, 0.4, "sawtooth", 0.07, -50),
  deny: () => beep(140, 0.08, "square", 0.04),
};
