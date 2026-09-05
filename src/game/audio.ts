let ctx: AudioContext | null = null;

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

function beep(freq: number, dur: number, type: OscillatorType, gain: number, slide = 0) {
  const audio = ac();
  if (!audio) return;
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), now + dur);
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(g);
  g.connect(audio.destination);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

export const sfx = {
  place: () => beep(220, 0.08, "triangle", 0.05),
  shootBow: () => beep(520, 0.05, "square", 0.03, -180),
  shootMortar: () => beep(90, 0.12, "sawtooth", 0.05, -40),
  shootFrost: () => beep(640, 0.07, "sine", 0.035, 80),
  shootSpark: () => beep(880, 0.06, "square", 0.04, -320),
  shootBramble: () => beep(210, 0.04, "triangle", 0.03, 40),
  horn: () => {
    beep(160, 0.22, "sawtooth", 0.06, 80);
    setTimeout(() => beep(220, 0.18, "triangle", 0.05), 80);
  },
  hit: () => beep(180, 0.04, "square", 0.025),
  kill: () => beep(340, 0.1, "triangle", 0.05, 220),
  leak: () => beep(110, 0.22, "sawtooth", 0.07, -70),
  wave: () => beep(280, 0.16, "triangle", 0.05, 160),
  win: () => {
    beep(392, 0.18, "triangle", 0.06);
    setTimeout(() => beep(523, 0.22, "triangle", 0.06), 140);
    setTimeout(() => beep(659, 0.28, "triangle", 0.07), 280);
  },
  lose: () => beep(90, 0.4, "sawtooth", 0.07, -50),
  deny: () => beep(140, 0.08, "square", 0.04),
};
