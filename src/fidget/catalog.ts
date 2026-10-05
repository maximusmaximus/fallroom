import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export const KINDS = [
  "milk",
  "brass",
  "bakelite",
  "neon",
  "celadon",
  "copper",
  "rubber",
  "chrome",
  "jade",
  "amber",
  "felt",
  "porcelain",
] as const;

export type Kind = (typeof KINDS)[number];

export type ColliderShape = "ball" | "cuboid" | "cylinder" | "cone" | "capsule" | "hull";

export type Finish = {
  color: string;
  roughness: number;
  metalness: number;
  density: number;
  friction: number;
  restitution: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  transmission?: number;
  thickness?: number;
  ior?: number;
  emissive?: string;
  emissiveIntensity?: number;
  sheen?: number;
  sheenColor?: string;
  attenuationColor?: string;
  attenuationDistance?: number;
  flat?: boolean;
  collider: ColliderShape;
  /** Primitive collider args as multiples of the toy radius. */
  args: number[];
};

export const FINISH: Record<Kind, Finish> = {
  milk: {
    color: "#f3f0e8",
    roughness: 0.06,
    metalness: 0,
    density: 0.55,
    friction: 0.18,
    restitution: 0.4,
    transmission: 0.92,
    thickness: 1.1,
    ior: 1.5,
    attenuationColor: "#f7f4ee",
    attenuationDistance: 1.4,
    clearcoat: 0.3,
    clearcoatRoughness: 0.15,
    collider: "ball",
    args: [1],
  },
  brass: {
    color: "#b08d57",
    roughness: 0.32,
    metalness: 1,
    density: 2.4,
    friction: 0.34,
    restitution: 0.18,
    clearcoat: 0.25,
    clearcoatRoughness: 0.4,
    collider: "cuboid",
    args: [0.72, 0.72, 0.72],
  },
  bakelite: {
    color: "#6e2e2a",
    roughness: 0.48,
    metalness: 0.08,
    density: 1.15,
    friction: 0.48,
    restitution: 0.14,
    clearcoat: 0.55,
    clearcoatRoughness: 0.28,
    collider: "cylinder",
    args: [0.82, 0.7],
  },
  neon: {
    color: "#ff5a45",
    roughness: 0.28,
    metalness: 0,
    density: 0.4,
    friction: 0.36,
    restitution: 0.32,
    emissive: "#ff3b24",
    emissiveIntensity: 2.4,
    transmission: 0.2,
    thickness: 0.6,
    collider: "capsule",
    args: [0.52, 0.46],
  },
  celadon: {
    color: "#7fa192",
    roughness: 0.42,
    metalness: 0.02,
    density: 1.35,
    friction: 0.4,
    restitution: 0.16,
    clearcoat: 0.35,
    clearcoatRoughness: 0.35,
    collider: "cone",
    args: [0.86, 0.78],
  },
  copper: {
    color: "#b56a45",
    roughness: 0.28,
    metalness: 1,
    density: 2.1,
    friction: 0.3,
    restitution: 0.2,
    flat: true,
    collider: "hull",
    args: [],
  },
  rubber: {
    color: "#2a2926",
    roughness: 0.92,
    metalness: 0,
    density: 0.95,
    friction: 0.72,
    restitution: 0.06,
    flat: true,
    collider: "hull",
    args: [],
  },
  chrome: {
    color: "#e4e4e1",
    roughness: 0.05,
    metalness: 1,
    density: 1.7,
    friction: 0.14,
    restitution: 0.26,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    flat: true,
    collider: "hull",
    args: [],
  },
  jade: {
    color: "#3e6f60",
    roughness: 0.22,
    metalness: 0.12,
    density: 1.5,
    friction: 0.38,
    restitution: 0.18,
    clearcoat: 0.7,
    clearcoatRoughness: 0.18,
    flat: true,
    collider: "hull",
    args: [],
  },
  amber: {
    color: "#e39a3b",
    roughness: 0.08,
    metalness: 0,
    density: 0.62,
    friction: 0.2,
    restitution: 0.36,
    transmission: 0.86,
    thickness: 1.3,
    ior: 1.48,
    emissive: "#c46a12",
    emissiveIntensity: 0.55,
    attenuationColor: "#e39a3b",
    attenuationDistance: 0.7,
    collider: "hull",
    args: [],
  },
  felt: {
    color: "#cbbba6",
    roughness: 1,
    metalness: 0,
    density: 0.32,
    friction: 0.9,
    restitution: 0.03,
    sheen: 0.85,
    sheenColor: "#efe6d8",
    collider: "hull",
    args: [],
  },
  porcelain: {
    color: "#d7e3ea",
    roughness: 0.18,
    metalness: 0.04,
    density: 1.25,
    friction: 0.42,
    restitution: 0.17,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
    collider: "hull",
    args: [],
  },
};

const geos = new Map<string, THREE.BufferGeometry>();

function buildGeometry(kind: Kind, seg: number): THREE.BufferGeometry {
  switch (kind) {
    case "milk":
      return new THREE.SphereGeometry(1, seg, Math.max(12, seg >> 1));
    case "brass":
      return new THREE.BoxGeometry(1.44, 1.44, 1.44);
    case "bakelite":
      return new THREE.CylinderGeometry(0.7, 0.7, 1.64, Math.max(16, seg));
    case "neon":
      return new THREE.CapsuleGeometry(0.46, 1.04, 6, Math.max(12, seg >> 1));
    case "celadon":
      return new THREE.ConeGeometry(0.78, 1.72, Math.max(16, seg));
    case "copper":
      return new THREE.OctahedronGeometry(1.05, 0);
    case "rubber":
      return new THREE.IcosahedronGeometry(1, 0);
    case "chrome":
      return new THREE.DodecahedronGeometry(0.98, 0);
    case "jade":
      return new THREE.TetrahedronGeometry(1.15, 0);
    case "amber": {
      const g = new THREE.SphereGeometry(1, Math.min(seg, 24), Math.min(Math.max(12, seg >> 1), 16));
      g.scale(1.32, 0.74, 1.02);
      return g;
    }
    case "felt":
      return new RoundedBoxGeometry(1.4, 1.05, 1.55, 2, 0.16);
    case "porcelain":
      return new THREE.CylinderGeometry(0.82, 0.82, 1.35, 5);
    default:
      return new THREE.SphereGeometry(1, 16, 12);
  }
}

export function geometry(kind: Kind, seg: number): THREE.BufferGeometry {
  const key = `${kind}:${seg}`;
  let geo = geos.get(key);
  if (!geo) {
    geo = buildGeometry(kind, seg);
    geos.set(key, geo);
  }
  return geo;
}

export function hullPoints(kind: Kind, seg: number, radius: number): Float32Array {
  const attr = geometry(kind, seg).getAttribute("position");
  const out = new Float32Array(attr.count * 3);
  for (let i = 0; i < attr.count; i += 1) {
    out[i * 3] = attr.getX(i) * radius;
    out[i * 3 + 1] = attr.getY(i) * radius;
    out[i * 3 + 2] = attr.getZ(i) * radius;
  }
  return out;
}

/** Log-uniform nominal scale from 1/100 to 10×, then a physics-stable radius. */
export function radiusFor(nominal: number, roomWidth: number): number {
  const raw = 0.2 * nominal;
  return Math.min(Math.max(raw, 0.034), roomWidth * 0.34);
}

export function sampleNominal(): number {
  const t = Math.random();
  return Math.exp(Math.log(0.01) + t * (Math.log(10) - Math.log(0.01)));
}

export function varyColor(hex: string, salt: number): string {
  const color = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  const n = ((salt * 17) % 11) - 5;
  color.setHSL(hsl.h, hsl.s, Math.min(0.92, Math.max(0.04, hsl.l + n * 0.012)));
  return `#${color.getHexString()}`;
}
