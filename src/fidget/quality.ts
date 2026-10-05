export type Tier = "low" | "mid" | "high" | "ultra";

export type Profile = {
  tier: Tier;
  capPortrait: number;
  capDesktop: number;
  seed: number;
  interval: number;
  shadows: number;
  dpr: [number, number];
  seg: number;
  voices: number;
  partials: number;
  reverbSeconds: number;
  lights: number;
  vapor: number;
  iterations: number;
  pgs: number;
  ccd: number;
  bloom: boolean;
  hrtf: boolean;
  sampleRate: number;
};

const ORDER: Tier[] = ["low", "mid", "high", "ultra"];

const PROFILES: Record<Tier, Profile> = {
  low: {
    tier: "low",
    capPortrait: 18,
    capDesktop: 12,
    seed: 6,
    interval: 0.46,
    shadows: 1024,
    dpr: [1, 1],
    seg: 16,
    voices: 10,
    partials: 2,
    reverbSeconds: 0,
    lights: 2,
    vapor: 28,
    iterations: 6,
    pgs: 1,
    ccd: 1,
    bloom: false,
    hrtf: false,
    sampleRate: 44100,
  },
  mid: {
    tier: "mid",
    capPortrait: 34,
    capDesktop: 20,
    seed: 9,
    interval: 0.3,
    shadows: 2048,
    dpr: [1, 1.5],
    seg: 24,
    voices: 18,
    partials: 4,
    reverbSeconds: 0.45,
    lights: 4,
    vapor: 52,
    iterations: 8,
    pgs: 1,
    ccd: 2,
    bloom: true,
    hrtf: false,
    sampleRate: 44100,
  },
  high: {
    tier: "high",
    capPortrait: 54,
    capDesktop: 30,
    seed: 12,
    interval: 0.18,
    shadows: 2048,
    dpr: [1, 1.75],
    seg: 32,
    voices: 32,
    partials: 7,
    reverbSeconds: 0.95,
    lights: 6,
    vapor: 78,
    iterations: 11,
    pgs: 2,
    ccd: 3,
    bloom: true,
    hrtf: true,
    sampleRate: 48000,
  },
  ultra: {
    tier: "ultra",
    capPortrait: 78,
    capDesktop: 42,
    seed: 16,
    interval: 0.11,
    shadows: 4096,
    dpr: [1, 2],
    seg: 40,
    voices: 48,
    partials: 11,
    reverbSeconds: 1.7,
    lights: 8,
    vapor: 120,
    iterations: 14,
    pgs: 2,
    ccd: 4,
    bloom: true,
    hrtf: true,
    sampleRate: 96000,
  },
};

export function profile(tier: Tier): Profile {
  return PROFILES[tier];
}

export function capFor(tier: Tier, portrait: boolean): number {
  const p = PROFILES[tier];
  return portrait ? p.capPortrait : p.capDesktop;
}

export function stepTier(tier: Tier, dir: -1 | 1, ceiling: Tier): Tier {
  const i = ORDER.indexOf(tier);
  const max = ORDER.indexOf(ceiling);
  return ORDER[Math.max(0, Math.min(max, i + dir))];
}

export type DeviceClass = { tier: Tier; software: boolean };

export function detectDevice(): DeviceClass {
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const dpr = window.devicePixelRatio || 1;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  let score = 0;
  let software = false;
  if (cores >= 10) score += 2;
  else if (cores >= 6) score += 1;
  if (mem >= 8) score += 2;
  else if (mem >= 4) score += 1;
  if (dpr >= 2) score += 1;
  if (coarse) score -= 1;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (gl) {
      const max = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
      if (max >= 8192) score += 1;
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      if (dbg) {
        const renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL));
        if (/SwiftShader|llvmpipe|Software|Microsoft Basic Render/i.test(renderer)) {
          software = true;
          score -= 4;
        }
      }
    } else {
      software = true;
      score -= 3;
    }
  } catch {
    software = true;
  }
  const tier: Tier = score >= 5 ? "ultra" : score >= 3 ? "high" : score >= 1 ? "mid" : "low";
  return { tier, software };
}
