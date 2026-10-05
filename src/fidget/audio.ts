import type { Kind } from "@/fidget/catalog";
import { profile, type Tier } from "@/fidget/quality";

type Partial = { ratio: number; gain: number; type?: OscillatorType };

type Timbre = {
  fundamental: number;
  type: OscillatorType;
  partials: Partial[];
  noise: number;
  noiseFreq: number;
  decay: number;
  cutoff: number;
  q: number;
  send: number;
};

const TIMBRE: Record<Kind, Timbre> = {
  milk: {
    fundamental: 880,
    type: "sine",
    partials: [
      { ratio: 1, gain: 0.7 },
      { ratio: 2.76, gain: 0.28 },
      { ratio: 5.04, gain: 0.12 },
      { ratio: 8.1, gain: 0.05 },
    ],
    noise: 0.18,
    noiseFreq: 3200,
    decay: 0.28,
    cutoff: 5200,
    q: 0.6,
    send: 0.45,
  },
  brass: {
    fundamental: 220,
    type: "sawtooth",
    partials: [
      { ratio: 1, gain: 0.45 },
      { ratio: 2, gain: 0.32 },
      { ratio: 3, gain: 0.18 },
      { ratio: 4.2, gain: 0.1 },
      { ratio: 5.6, gain: 0.05 },
    ],
    noise: 0.06,
    noiseFreq: 900,
    decay: 0.34,
    cutoff: 1800,
    q: 0.8,
    send: 0.28,
  },
  bakelite: {
    fundamental: 310,
    type: "triangle",
    partials: [
      { ratio: 1, gain: 0.75 },
      { ratio: 2.01, gain: 0.22 },
      { ratio: 3.4, gain: 0.08 },
    ],
    noise: 0.14,
    noiseFreq: 700,
    decay: 0.2,
    cutoff: 1400,
    q: 0.5,
    send: 0.18,
  },
  neon: {
    fundamental: 540,
    type: "square",
    partials: [
      { ratio: 1, gain: 0.35 },
      { ratio: 3, gain: 0.18 },
      { ratio: 5, gain: 0.08 },
    ],
    noise: 0.08,
    noiseFreq: 1800,
    decay: 0.16,
    cutoff: 2400,
    q: 1.2,
    send: 0.22,
  },
  celadon: {
    fundamental: 480,
    type: "sine",
    partials: [
      { ratio: 1, gain: 0.7 },
      { ratio: 2.4, gain: 0.25 },
      { ratio: 3.9, gain: 0.12 },
      { ratio: 6.2, gain: 0.05 },
    ],
    noise: 0.05,
    noiseFreq: 1600,
    decay: 0.42,
    cutoff: 3600,
    q: 0.4,
    send: 0.4,
  },
  copper: {
    fundamental: 196,
    type: "triangle",
    partials: [
      { ratio: 1, gain: 0.6 },
      { ratio: 1.5, gain: 0.35 },
      { ratio: 2.2, gain: 0.2 },
      { ratio: 3.7, gain: 0.1 },
      { ratio: 5.1, gain: 0.05 },
    ],
    noise: 0.1,
    noiseFreq: 1100,
    decay: 0.3,
    cutoff: 2200,
    q: 0.9,
    send: 0.3,
  },
  rubber: {
    fundamental: 90,
    type: "sine",
    partials: [
      { ratio: 1, gain: 0.9 },
      { ratio: 1.07, gain: 0.2 },
    ],
    noise: 0.35,
    noiseFreq: 240,
    decay: 0.18,
    cutoff: 600,
    q: 0.4,
    send: 0.12,
  },
  chrome: {
    fundamental: 1320,
    type: "sine",
    partials: [
      { ratio: 1, gain: 0.55 },
      { ratio: 2.01, gain: 0.2 },
      { ratio: 4.1, gain: 0.16 },
      { ratio: 8.2, gain: 0.08 },
      { ratio: 11.3, gain: 0.04 },
    ],
    noise: 0.12,
    noiseFreq: 5400,
    decay: 0.22,
    cutoff: 9000,
    q: 0.7,
    send: 0.5,
  },
  jade: {
    fundamental: 392,
    type: "sine",
    partials: [
      { ratio: 1, gain: 0.7 },
      { ratio: 2, gain: 0.28 },
      { ratio: 3, gain: 0.16 },
      { ratio: 4.5, gain: 0.08 },
      { ratio: 6.1, gain: 0.04 },
    ],
    noise: 0.03,
    noiseFreq: 2000,
    decay: 0.7,
    cutoff: 4200,
    q: 0.3,
    send: 0.55,
  },
  amber: {
    fundamental: 660,
    type: "sine",
    partials: [
      { ratio: 1, gain: 0.65 },
      { ratio: 2.5, gain: 0.22 },
      { ratio: 3.2, gain: 0.14 },
      { ratio: 5.7, gain: 0.07 },
    ],
    noise: 0.1,
    noiseFreq: 2600,
    decay: 0.36,
    cutoff: 4800,
    q: 0.55,
    send: 0.42,
  },
  felt: {
    fundamental: 140,
    type: "triangle",
    partials: [{ ratio: 1, gain: 0.25 }],
    noise: 0.85,
    noiseFreq: 420,
    decay: 0.14,
    cutoff: 900,
    q: 0.6,
    send: 0.08,
  },
  porcelain: {
    fundamental: 740,
    type: "sine",
    partials: [
      { ratio: 1, gain: 0.6 },
      { ratio: 2.71, gain: 0.3 },
      { ratio: 4.4, gain: 0.12 },
      { ratio: 6.8, gain: 0.05 },
    ],
    noise: 0.08,
    noiseFreq: 2800,
    decay: 0.38,
    cutoff: 4600,
    q: 0.5,
    send: 0.36,
  },
};

type Voice = { stop: () => void; born: number };

class Engine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  dry: GainNode | null = null;
  wet: GainNode | null = null;
  convolver: ConvolverNode | null = null;
  noise: AudioBuffer | null = null;
  tier: Tier = "high";
  muted = false;
  voices: Voice[] = [];
  lastPair = new Map<string, number>();
  shock = { x: 0, y: 0, z: 0, reach: 0, until: 0, lift: 0 };
  actualRate = 48000;

  configure(tier: Tier) {
    const prev = this.tier;
    this.tier = tier;
    if (!this.ctx) return;
    if (profile(prev).reverbSeconds !== profile(tier).reverbSeconds) this.buildReverb();
  }

  unlock() {
    const ctx = this.ensure();
    if (ctx.state === "suspended") void ctx.resume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (!this.master || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(muted ? 0 : 0.85, now, 0.02);
  }

  sampleRate() {
    return this.ctx?.sampleRate ?? this.actualRate;
  }

  impact(
    a: { kind: Kind; radius: number },
    b: { kind: Kind; radius: number } | null,
    rel: number,
    at: { x: number; y: number; z: number },
    pairKey: string,
  ) {
    if (!this.ctx || this.muted) return;
    if (rel < 0.22) return;
    const nowMs = performance.now();
    const prev = this.lastPair.get(pairKey) ?? 0;
    if (nowMs - prev < 55) return;
    this.lastPair.set(pairKey, nowMs);
    const gain = Math.min(1, 0.18 + rel / 5.2);
    this.play(a.kind, a.radius, gain, at, 1);
    if (b) this.play(b.kind, b.radius, gain * 0.92, at, 1);
  }

  pop(kind: Kind, radius: number, at: { x: number; y: number; z: number }) {
    this.unlock();
    const reach = 1.3 + radius * 3.6;
    this.shock = { x: at.x, y: at.y, z: at.z, reach, until: performance.now() + 1200, lift: 1.65 };
    this.play(kind, radius, 1, at, 2.7);
    this.crack(at, radius);
  }

  private ensure() {
    if (this.ctx) return this.ctx;
    const wanted = profile(this.tier).sampleRate;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx({ sampleRate: wanted, latencyHint: "interactive" });
    this.actualRate = this.ctx.sampleRate;
    const master = this.ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.85;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.knee.value = 16;
    comp.ratio.value = 3.4;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    master.connect(comp);
    comp.connect(this.ctx.destination);
    this.master = master;
    this.dry = this.ctx.createGain();
    this.dry.gain.value = 1;
    this.dry.connect(master);
    this.wet = this.ctx.createGain();
    this.wet.gain.value = 0.34;
    this.wet.connect(master);
    this.buildReverb();
    const noiseLen = Math.floor(this.ctx.sampleRate * 0.8);
    this.noise = this.ctx.createBuffer(1, noiseLen, this.ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < noiseLen; i += 1) data[i] = Math.random() * 2 - 1;
    return this.ctx;
  }

  private buildReverb() {
    if (!this.ctx || !this.wet) return;
    const seconds = profile(this.tier).reverbSeconds;
    if (this.convolver) {
      this.convolver.disconnect();
      this.convolver = null;
    }
    if (seconds <= 0) return;
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const buffer = this.ctx.createBuffer(2, length, rate);
    for (let c = 0; c < 2; c += 1) {
      const channel = buffer.getChannelData(c);
      for (let i = 0; i < length; i += 1) {
        const t = i / length;
        channel[i] = (Math.random() * 2 - 1) * (1 - t) ** (c === 0 ? 2.4 : 2.7);
      }
    }
    const conv = this.ctx.createConvolver();
    conv.buffer = buffer;
    conv.connect(this.wet);
    this.convolver = conv;
  }

  private steal() {
    const cap = profile(this.tier).voices;
    while (this.voices.length >= cap) {
      const oldest = this.voices.shift();
      oldest?.stop();
    }
  }

  private pitchAt(fundamental: number, radius: number, at: { x: number; y: number; z: number }, lift: number) {
    let pitch = fundamental * Math.sqrt(0.2 / Math.max(radius, 0.03)) * lift;
    const now = performance.now();
    if (now < this.shock.until && this.shock.reach > 0) {
      const dx = at.x - this.shock.x;
      const dy = at.y - this.shock.y;
      const dz = at.z - this.shock.z;
      const d = Math.hypot(dx, dy, dz);
      if (d < this.shock.reach) pitch *= 1 + this.shock.lift * (1 - d / this.shock.reach);
    }
    return pitch;
  }

  private play(kind: Kind, radius: number, gain: number, at: { x: number; y: number; z: number }, lift: number) {
    if (this.muted) return;
    const ctx = this.ctx;
    if (!ctx || !this.dry || gain < 0.02) return;
    this.steal();
    const timbre = TIMBRE[kind];
    const now = ctx.currentTime;
    const pitch = this.pitchAt(timbre.fundamental, radius, at, lift);
    const count = profile(this.tier).partials;
    const bus = ctx.createGain();
    const stops: Array<() => void> = [];
    bus.gain.setValueAtTime(0.0001, now);
    bus.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), now + 0.008);
    bus.gain.exponentialRampToValueAtTime(0.0001, now + timbre.decay);

    for (const partial of timbre.partials.slice(0, count)) {
      const osc = ctx.createOscillator();
      osc.type = partial.type ?? timbre.type;
      const detune = 1 + (Math.random() - 0.5) * 0.014;
      osc.frequency.setValueAtTime(Math.max(28, pitch * partial.ratio * detune), now);
      const g = ctx.createGain();
      g.gain.value = partial.gain;
      osc.connect(g);
      g.connect(bus);
      osc.start(now);
      osc.stop(now + timbre.decay + 0.03);
      stops.push(() => {
        try {
          osc.stop();
        } catch {
          /* already stopped */
        }
        osc.disconnect();
        g.disconnect();
      });
    }

    if (timbre.noise > 0 && this.noise) {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const startAt = Math.random() * Math.max(0, this.noise.duration - timbre.decay);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = timbre.noiseFreq * Math.sqrt(0.2 / Math.max(radius, 0.04));
      bp.Q.value = 0.7;
      const ng = ctx.createGain();
      ng.gain.value = timbre.noise;
      src.connect(bp);
      bp.connect(ng);
      ng.connect(bus);
      src.start(now, startAt);
      src.stop(now + timbre.decay);
      stops.push(() => {
        try {
          src.stop();
        } catch {
          /* already stopped */
        }
        src.disconnect();
        bp.disconnect();
        ng.disconnect();
      });
    }

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(timbre.cutoff, now);
    filter.Q.value = timbre.q;
    bus.connect(filter);

    const p = profile(this.tier);
    let tail: AudioNode = filter;
    if (p.hrtf) {
      const panner = ctx.createPanner();
      panner.panningModel = "HRTF";
      panner.distanceModel = "inverse";
      panner.refDistance = 1.8;
      panner.maxDistance = 24;
      panner.rolloffFactor = 1.15;
      panner.positionX.setValueAtTime(at.x, now);
      panner.positionY.setValueAtTime(at.y, now);
      panner.positionZ.setValueAtTime(at.z, now);
      filter.connect(panner);
      tail = panner;
      stops.push(() => panner.disconnect());
    } else {
      const pan = ctx.createStereoPanner();
      pan.pan.setValueAtTime(Math.max(-1, Math.min(1, at.x / 2.8)), now);
      filter.connect(pan);
      tail = pan;
      stops.push(() => pan.disconnect());
    }
    tail.connect(this.dry);
    if (this.convolver && p.reverbSeconds > 0) {
      const send = ctx.createGain();
      send.gain.value = timbre.send;
      tail.connect(send);
      send.connect(this.convolver);
      stops.push(() => send.disconnect());
    }
    stops.push(() => {
      bus.disconnect();
      filter.disconnect();
    });
    const voice: Voice = {
      born: performance.now(),
      stop: () => {
        for (const stop of stops) stop();
      },
    };
    this.voices.push(voice);
    window.setTimeout(() => {
      const i = this.voices.indexOf(voice);
      if (i >= 0) this.voices.splice(i, 1);
    }, timbre.decay * 1000 + 80);
  }

  private crack(at: { x: number; y: number; z: number }, radius: number) {
    const ctx = this.ctx;
    if (!ctx || !this.dry || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    const f0 = Math.max(1400, 2400 * Math.sqrt(0.2 / Math.max(radius, 0.04)));
    osc.frequency.setValueAtTime(f0, now);
    osc.frequency.exponentialRampToValueAtTime(f0 * 1.8, now + 0.045);
    osc.frequency.exponentialRampToValueAtTime(Math.max(400, f0 * 0.45), now + 0.22);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.55, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    osc.connect(g);
    g.connect(this.dry);
    osc.start(now);
    osc.stop(now + 0.26);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
    void at;
  }

  listen(x: number, y: number, z: number, fx: number, fy: number, fz: number, ux: number, uy: number, uz: number) {
    const ctx = this.ctx;
    if (!ctx || !profile(this.tier).hrtf) return;
    const l = ctx.listener;
    const now = ctx.currentTime;
    const set = (param: AudioParam, value: number) => {
      param.setTargetAtTime(value, now, 0.03);
    };
    set(l.positionX, x);
    set(l.positionY, y);
    set(l.positionZ, z);
    set(l.forwardX, fx);
    set(l.forwardY, fy);
    set(l.forwardZ, fz);
    set(l.upX, ux);
    set(l.upY, uy);
    set(l.upZ, uz);
  }
}

export const audio = new Engine();

export function timbreName(kind: Kind): string {
  return TIMBRE[kind] ? kind : "milk";
}
