// Sound design for the opening animation (src/components/Splash.tsx), synthesised with the Web Audio API — no audio
// files. Every cue is placed on the animation's timeline (seconds), so sound and picture stay in sync:
//
//   0.0–6.6  drone      a soft tanpura-like drone on Sa and Pa (D and A) under everything
//   0.05     fall       a falling whistle as the drop comes down
//   0.57     impact     low thump + dust, then three shimmering rings
//   0.95     flight     a whoosh that travels left → right with the plane
//   1.05…    words      one note per word (Courses, APS, dMAT, Visa) on a pentatonic scale
//   2.40     wipe       three quick swooshes for the black-red-gold bands
//   3.00     anchors    two soft taps as India and Germany land
//   3.32     build      a rising glide while the half-arches draw
//   3.70     meet       a bell when the arches meet, with sparkle
//   3.78     cables     tiny ticks as the cables drop
//   4.30     "Setu"     a plucked phrase, one note per letter
//   4.90     gold dot   a shimmering glide across the bridge
//   6.15     open       a deep swoosh as the screen splits open

type Engine = { ctx: AudioContext; out: GainNode; noise: AudioBuffer };

// Notes (Hz): D major pentatonic — Sa Re Ga Pa Dha.
const N = { D3: 146.83, A3: 220, D4: 293.66, E4: 329.63, Fs4: 369.99, A4: 440, B4: 493.88, D5: 587.33, E5: 659.25, Fs5: 739.99, A5: 880, D6: 1174.66, A6: 1760 };

function createEngine(): Engine | null {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  const comp = ctx.createDynamicsCompressor(); // keeps overlapping cues from clipping on phone speakers
  comp.threshold.value = -18;
  comp.ratio.value = 4;
  const out = ctx.createGain();
  out.gain.value = 0.8;
  out.connect(comp).connect(ctx.destination);
  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return { ctx, out, noise };
}

type ToneOpts = { type?: OscillatorType; gain?: number; attack?: number; glideTo?: number; pan?: number; detune?: number };

/** One note: quick attack, exponential decay. `at` and `dur` are seconds on the AudioContext clock. */
function tone(e: Engine, freq: number, at: number, dur: number, o: ToneOpts = {}) {
  const osc = e.ctx.createOscillator();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(freq, at);
  if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(o.glideTo, at + dur);
  if (o.detune) osc.detune.value = o.detune;
  const g = e.ctx.createGain();
  const peak = o.gain ?? 0.2;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + (o.attack ?? 0.01));
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  const pan = e.ctx.createStereoPanner();
  pan.pan.value = o.pan ?? 0;
  osc.connect(g).connect(pan).connect(e.out);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

type NoiseOpts = { filter?: BiquadFilterType; from: number; to?: number; q?: number; gain?: number; panFrom?: number; panTo?: number; attack?: number };

/** Filtered noise with a moving filter and pan: whooshes, swooshes and dust. */
function noise(e: Engine, at: number, dur: number, o: NoiseOpts) {
  const src = e.ctx.createBufferSource();
  src.buffer = e.noise;
  src.loop = true;
  const f = e.ctx.createBiquadFilter();
  f.type = o.filter ?? "bandpass";
  f.Q.value = o.q ?? 1;
  f.frequency.setValueAtTime(o.from, at);
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, at + dur);
  const g = e.ctx.createGain();
  const peak = o.gain ?? 0.2;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + (o.attack ?? dur * 0.4));
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  const pan = e.ctx.createStereoPanner();
  pan.pan.setValueAtTime(o.panFrom ?? 0, at);
  if (o.panTo !== undefined) pan.pan.linearRampToValueAtTime(o.panTo, at + dur);
  src.connect(f).connect(g).connect(pan).connect(e.out);
  src.start(at);
  src.stop(at + dur + 0.05);
}

/** The drone: two detuned saws per note through a soft low-pass, swelling in and fading with the exit. */
function drone(e: Engine, at: number, end: number) {
  const lp = e.ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 700;
  const g = e.ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.05, at + 0.8);
  g.gain.setValueAtTime(0.05, end - 0.8);
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  lp.connect(g).connect(e.out);
  for (const [freq, detune] of [[N.D3, -6], [N.D3, 6], [N.A3, -4], [N.A3, 5]] as const) {
    const o = e.ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = freq;
    o.detune.value = detune;
    o.connect(lp);
    o.start(at);
    o.stop(end + 0.05);
  }
}

/** A bell: a few inharmonic partials with long decays. */
function bell(e: Engine, freq: number, at: number, gain = 0.18) {
  for (const [ratio, g, d] of [[1, 1, 2.2], [2.76, 0.35, 1.2], [5.4, 0.15, 0.6]] as const) tone(e, freq * ratio, at, d, { gain: gain * g, attack: 0.005 });
}

/** Schedules every cue that falls after `from` (seconds into the animation). */
function schedule(e: Engine, from: number) {
  const t0 = e.ctx.currentTime + 0.03 - from; // animation time 0 on the audio clock
  const at = (s: number) => t0 + s;
  const cue = (s: number, play: () => void) => {
    if (s >= from - 0.02) play();
  };

  if (from < 6) drone(e, at(Math.max(0, from)), at(6.6));
  cue(0.05, () => tone(e, 1300, at(0.05), 0.5, { glideTo: 260, gain: 0.05, attack: 0.15 }));
  cue(0.57, () => {
    tone(e, 140, at(0.57), 0.45, { glideTo: 42, gain: 0.7, attack: 0.004 });
    noise(e, at(0.57), 0.35, { filter: "lowpass", from: 900, to: 120, gain: 0.25, attack: 0.005 });
  });
  [0.6, 0.69, 0.78].forEach((s, i) => cue(s, () => tone(e, [N.A5, N.D6, N.A6][i], at(s), 0.9, { gain: 0.05, attack: 0.02, pan: [-0.4, 0.4, 0][i] })));
  cue(0.95, () => noise(e, at(0.95), 1.4, { from: 350, to: 2600, q: 2.5, gain: 0.22, panFrom: -0.8, panTo: 0.9 }));
  [1.05, 1.35, 1.65, 1.95].forEach((s, i) => cue(s, () => tone(e, [N.D5, N.E5, N.Fs5, N.A5][i], at(s), 0.45, { type: "triangle", gain: 0.13, pan: 0.15 * (i - 1.5) })));
  [2.4, 2.47, 2.54].forEach((s, i) => cue(s, () => noise(e, at(s), 0.45, { filter: "highpass", from: 1200 + i * 500, to: 4000, gain: 0.16, panFrom: 0.8, panTo: -0.8, attack: 0.12 })));
  cue(3.0, () => tone(e, N.D4, at(3.0), 0.3, { type: "triangle", gain: 0.15, pan: -0.6 }));
  cue(3.05, () => tone(e, N.A4, at(3.05), 0.3, { type: "triangle", gain: 0.15, pan: 0.6 }));
  cue(3.32, () => tone(e, 290, at(3.32), 0.4, { glideTo: 880, gain: 0.06, attack: 0.3 }));
  cue(3.7, () => {
    bell(e, N.D6, at(3.7));
    for (let i = 0; i < 6; i++) tone(e, 2600 + i * 420, at(3.72 + i * 0.035), 0.25, { gain: 0.025, pan: (i % 2 ? 1 : -1) * 0.5 });
  });
  for (let i = 0; i < 7; i++) cue(3.78 + i * 0.04, () => tone(e, 3200, at(3.78 + i * 0.04), 0.05, { type: "square", gain: 0.012 }));
  [N.D5, N.Fs5, N.A5, N.D6].forEach((f, i) => cue(4.3 + i * 0.085, () => tone(e, f, at(4.3 + i * 0.085), 0.9, { type: "triangle", gain: 0.11 })));
  cue(4.9, () => tone(e, N.A5, at(4.9), 1.0, { glideTo: N.D6, gain: 0.03, attack: 0.4 }));
  cue(6.15, () => noise(e, at(6.15), 0.7, { filter: "lowpass", from: 1800, to: 160, gain: 0.3, attack: 0.08 }));
}

let engine: Engine | null = null;

/** Starts the intro sound `from` seconds into the animation. Resolves false if the browser blocks audio. */
export async function playIntroSound(from: number): Promise<boolean> {
  try {
    engine ??= createEngine();
    if (!engine) return false;
    if (engine.ctx.state !== "running") await Promise.race([engine.ctx.resume(), new Promise((r) => setTimeout(r, 300))]);
    if (engine.ctx.state !== "running") return false; // needs a tap first (browser autoplay rules)
    engine.out.gain.cancelScheduledValues(engine.ctx.currentTime);
    engine.out.gain.setValueAtTime(0.8, engine.ctx.currentTime);
    schedule(engine, from);
    return true;
  } catch {
    return false;
  }
}

/** Fades everything out (when the intro is skipped or the sound is switched off). */
export function stopIntroSound() {
  if (!engine) return;
  const { ctx, out } = engine;
  out.gain.cancelScheduledValues(ctx.currentTime);
  out.gain.setValueAtTime(out.gain.value, ctx.currentTime);
  out.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
  const old = engine;
  engine = null; // a new context next time, so cues already scheduled can't come back
  setTimeout(() => old.ctx.close().catch(() => {}), 400);
}
