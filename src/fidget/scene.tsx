import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BallCollider,
  CapsuleCollider,
  ConeCollider,
  ConvexHullCollider,
  CuboidCollider,
  CylinderCollider,
  Physics,
  RigidBody,
  useRapier,
  type RapierRigidBody,
} from "@react-three/rapier";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import * as THREE from "three";
import type { World } from "@dimforge/rapier3d-compat";
import { audio } from "@/fidget/audio";
import {
  FINISH,
  KINDS,
  geometry,
  hullPoints,
  radiusFor,
  sampleNominal,
  varyColor,
  type Kind,
} from "@/fidget/catalog";
import { beginHold, endHold, gesture, holdMs, markPopped } from "@/fidget/gesture";
import { capFor, profile, type Tier } from "@/fidget/quality";
import { tilt } from "@/fidget/tilt";

export type Room = { width: number; height: number; depth: number };

export function roomFor(vw: number, vh: number): Room {
  const width = 5.6;
  const depth = width;
  const aspect = vw / Math.max(vh, 1);
  const height = Math.max(width * 0.92, width / Math.max(aspect, 0.28));
  return { width, depth, height };
}

type Toy = {
  id: number;
  kind: Kind;
  radius: number;
  color: string;
  lit: boolean;
  position: [number, number, number];
  rotation: [number, number, number];
  spin: [number, number, number];
};

type Meta = { toy: true; kind: Kind; radius: number };

type Puff = {
  id: number;
  at: [number, number, number];
  color: string;
  count: number;
  reach: number;
};

const _fwd = new THREE.Vector3();
const _look = new THREE.Vector3();
const _pos = new THREE.Vector3();

function makeToy(id: number, room: Room, existing: Toy[], tier: Tier, yShift: number): Toy {
  const kind = KINDS[Math.floor(Math.random() * KINDS.length)] ?? "milk";
  const radius = radiusFor(sampleNominal(), room.width);
  const finish = FINISH[kind];
  const lit = Boolean(finish.emissive) && existing.filter((toy) => toy.lit).length < profile(tier).lights;
  let position: [number, number, number] = [0, room.height / 2 - radius, 0];
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const inset = Math.min(room.width * 0.42, radius + 0.14);
    const x = (Math.random() * 2 - 1) * (room.width / 2 - inset);
    const z = (Math.random() * 2 - 1) * (room.depth / 2 - inset);
    const y = room.height / 2 - radius - 0.18 - yShift;
    const clear = existing.every((other) => {
      const dx = other.position[0] - x;
      const dy = other.position[1] - y;
      const dz = other.position[2] - z;
      return dx * dx + dy * dy + dz * dz > (other.radius + radius + 0.1) ** 2;
    });
    position = [x, Math.max(-room.height / 2 + radius + 0.3, y), z];
    if (clear) break;
  }
  return {
    id,
    kind,
    radius,
    color: varyColor(finish.color, id),
    lit,
    position,
    rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
    spin: [(Math.random() - 0.5) * 3.4, (Math.random() - 0.5) * 3.4, (Math.random() - 0.5) * 3.4],
  };
}

function shove(
  world: World,
  origin: { x: number; y: number; z: number },
  self: number,
  power: number,
  reach: number,
) {
  world.forEachRigidBody((body) => {
    if (body.handle === self || !body.isDynamic()) return;
    const p = body.translation();
    const dx = p.x - origin.x;
    const dy = p.y - origin.y;
    const dz = p.z - origin.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist > reach || dist < 1e-4) return;
    const falloff = (1 - dist / reach) ** 1.35;
    const mag = power * falloff;
    body.applyImpulse({ x: (dx / dist) * mag, y: mag * 0.82, z: (dz / dist) * mag }, true);
    body.applyTorqueImpulse(
      {
        x: (Math.random() - 0.5) * mag * 0.38,
        y: (Math.random() - 0.5) * mag * 0.38,
        z: (Math.random() - 0.5) * mag * 0.38,
      },
      true,
    );
  });
}

function StudioEnv() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const texture = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = new RoomEnvironment();
    const target = pmrem.fromScene(env, 0.04);
    env.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
    pmrem.dispose();
    return target.texture;
  }, [gl]);

  useEffect(() => {
    scene.environmentIntensity = 0.4;
    return () => {
      texture.dispose();
    };
  }, [scene, texture]);

  return <primitive attach="environment" object={texture} />;
}

function SimRig({ room, onFps }: { room: Room; onFps: (fps: number) => void }) {
  const { world } = useRapier();
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const fps = useRef({ acc: 0, n: 0, cool: 0 });
  const prev = useRef({ roll: 0, pitch: 0 });

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    if (!tilt.freeze) {
      const k = 1 - Math.exp(-3.6 * d);
      tilt.smoothRoll += (tilt.roll - tilt.smoothRoll) * k;
      tilt.smoothPitch += (tilt.pitch - tilt.smoothPitch) * k;
    }
    const gRoll = THREE.MathUtils.clamp(tilt.smoothRoll, -1.05, 1.05);
    const gPitch = THREE.MathUtils.clamp(tilt.smoothPitch, -0.95, 0.95);
    const mag = 22;
    world.gravity = {
      x: Math.sin(gRoll) * mag,
      y: -Math.cos(gRoll) * Math.cos(gPitch) * mag,
      z: Math.sin(gPitch) * mag,
    };
    if (Math.hypot(gRoll - prev.current.roll, gPitch - prev.current.pitch) > 0.015) {
      world.forEachRigidBody((body) => {
        if (body.isDynamic() && body.isSleeping()) body.wakeUp();
      });
    }
    prev.current.roll = gRoll;
    prev.current.pitch = gPitch;

    const camRoll = THREE.MathUtils.clamp(tilt.smoothRoll, -0.52, 0.52);
    const camPitch = THREE.MathUtils.clamp(tilt.smoothPitch, -0.4, 0.4);
    const fov = 54;
    const eye = (room.height * 0.5) / Math.tan((fov * Math.PI) / 360);
    _pos.set(camRoll * 0.6, -room.height * 0.02 - camPitch * 0.4, room.depth / 2 + eye);
    camera.position.lerp(_pos, 1 - Math.exp(-5.5 * d));
    _look.set(
      camRoll * room.width * 0.36,
      -room.height * 0.06 + camPitch * room.height * 0.14,
      -room.depth * 0.08,
    );
    camera.lookAt(_look);
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.getWorldDirection(_fwd);
    audio.listen(camera.position.x, camera.position.y, camera.position.z, _fwd.x, _fwd.y, _fwd.z, 0, 1, 0);

    fps.current.cool -= d;
    fps.current.acc += 1 / Math.max(d, 1e-3);
    fps.current.n += 1;
    if (fps.current.n >= 36 && fps.current.cool <= 0) {
      onFps(fps.current.acc / fps.current.n);
      fps.current.acc = 0;
      fps.current.n = 0;
      fps.current.cool = 2.8;
    }
  });

  return null;
}

function Walls({ room }: { room: Room }) {
  const t = 0.42;
  const hw = room.width / 2;
  const hh = room.height / 2;
  const hd = room.depth / 2;
  const plaster = "#e7e2d9";
  const floor = "#d5cdc1";
  const trim = "#cfc6ba";
  const unlock = () => audio.unlock();

  return (
    <RigidBody type="fixed" colliders={false} userData={{ wall: true }}>
      <CuboidCollider args={[hw, t / 2, hd]} position={[0, -hh - t / 2, 0]} friction={0.72} restitution={0.12} />
      <CuboidCollider args={[t / 2, hh, hd]} position={[-hw - t / 2, 0, 0]} friction={0.55} restitution={0.1} />
      <CuboidCollider args={[t / 2, hh, hd]} position={[hw + t / 2, 0, 0]} friction={0.55} restitution={0.1} />
      <CuboidCollider args={[hw, hh, t / 2]} position={[0, 0, -hd - t / 2]} friction={0.55} restitution={0.1} />
      <CuboidCollider args={[hw, hh, t / 2]} position={[0, 0, hd + t / 2]} friction={0.4} restitution={0.08} />
      <CuboidCollider args={[hw, t / 2, hd]} position={[0, hh + t / 2, 0]} friction={0.4} restitution={0.08} />

      <mesh position={[0, -hh - t / 2, 0]} receiveShadow onPointerDown={unlock}>
        <boxGeometry args={[room.width + t * 2, t, room.depth + t * 2]} />
        <meshStandardMaterial color={floor} roughness={0.92} metalness={0} envMapIntensity={0.25} />
      </mesh>
      <mesh position={[-hw - t / 2, 0, 0]} receiveShadow onPointerDown={unlock}>
        <boxGeometry args={[t, room.height, room.depth]} />
        <meshStandardMaterial color={plaster} roughness={0.94} metalness={0} envMapIntensity={0.22} />
      </mesh>
      <mesh position={[hw + t / 2, 0, 0]} receiveShadow onPointerDown={unlock}>
        <boxGeometry args={[t, room.height, room.depth]} />
        <meshStandardMaterial color={plaster} roughness={0.94} metalness={0} envMapIntensity={0.22} />
      </mesh>
      <mesh position={[0, 0, -hd - t / 2]} receiveShadow onPointerDown={unlock}>
        <boxGeometry args={[room.width, room.height, t]} />
        <meshStandardMaterial color="#ddd6cc" roughness={0.95} metalness={0} envMapIntensity={0.2} />
      </mesh>
      <mesh position={[0, hh + t / 2, 0]} receiveShadow>
        <boxGeometry args={[room.width + t * 2, t, room.depth + t * 2]} />
        <meshStandardMaterial color="#ece7df" roughness={0.96} metalness={0} />
      </mesh>
      <mesh position={[0, hh - 0.045, hd - 0.03]} castShadow>
        <boxGeometry args={[room.width, 0.07, 0.07]} />
        <meshStandardMaterial color={trim} roughness={0.88} />
      </mesh>
      <mesh position={[0, -hh + 0.045, hd - 0.03]} castShadow>
        <boxGeometry args={[room.width, 0.07, 0.07]} />
        <meshStandardMaterial color={trim} roughness={0.88} />
      </mesh>
      <mesh position={[-hw + 0.045, 0, hd - 0.03]} castShadow>
        <boxGeometry args={[0.07, room.height, 0.07]} />
        <meshStandardMaterial color={trim} roughness={0.88} />
      </mesh>
      <mesh position={[hw - 0.045, 0, hd - 0.03]} castShadow>
        <boxGeometry args={[0.07, room.height, 0.07]} />
        <meshStandardMaterial color={trim} roughness={0.88} />
      </mesh>
    </RigidBody>
  );
}

function ToyBody({
  toy,
  seg,
  desktop,
  transmission,
  onPopped,
}: {
  toy: Toy;
  seg: number;
  desktop: boolean;
  transmission: boolean;
  onPopped: (puff: Puff) => void;
}) {
  const body = useRef<RapierRigidBody>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshPhysicalMaterial>(null);
  const { world } = useRapier();
  const desktopRef = useRef(desktop);
  desktopRef.current = desktop;
  const finish = FINISH[toy.kind];
  const geo = geometry(toy.kind, seg);
  const points = useMemo(
    () => (finish.collider === "hull" ? hullPoints(toy.kind, seg, toy.radius) : null),
    [finish.collider, toy.kind, toy.radius, seg],
  );
  const nudge = useRef(0);
  const pinned = useRef(false);

  useEffect(() => {
    const api = body.current;
    if (!api) return;
    const meta: Meta = { toy: true, kind: toy.kind, radius: toy.radius };
    api.userData = meta;
  }, [toy.kind, toy.radius]);

  useFrame((_, dt) => {
    const api = mesh.current;
    if (!api) return;
    let swell = 1;
    if (gesture.active && gesture.id === toy.id) {
      if (!pinned.current && body.current) {
        pinned.current = true;
        body.current.setGravityScale(0, true);
        body.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
      }
      const t = Math.min(1, (performance.now() - gesture.from) / holdMs());
      const k = t * t * (3 - 2 * t);
      swell = 1 + 0.25 * k;
      nudge.current += dt;
      if (t > 0.62 && nudge.current > 0.08 && body.current) {
        nudge.current = 0;
        const p = body.current.translation();
        shove(world, p, body.current.handle, toy.radius * 1.4, 0.45 + toy.radius * 1.6);
      }
      if (t >= 1 && !gesture.popped && body.current) {
        const p = body.current.translation();
        const at = { x: p.x, y: p.y, z: p.z };
        const reach = 1.25 + toy.radius * 3.5;
        const power = 28 * toy.radius * toy.radius * toy.radius + 2.2;
        shove(world, at, body.current.handle, power, reach);
        audio.pop(toy.kind, toy.radius, at);
        markPopped();
        onPopped({
          id: toy.id,
          at: [at.x, at.y, at.z],
          color: toy.color,
          count: 48,
          reach,
        });
        return;
      }
    } else if (gesture.returning && gesture.id === toy.id) {
      if (pinned.current && body.current) {
        pinned.current = false;
        body.current.setGravityScale(1, true);
      }
      const u = Math.min(1, (performance.now() - gesture.releasedAt) / 240);
      swell = gesture.releaseScale + (1 - gesture.releaseScale) * u;
      if (u >= 1) {
        gesture.returning = false;
        gesture.id = -1;
        swell = 1;
      }
    }
    api.scale.setScalar(toy.radius * swell);
    if (mat.current) {
      mat.current.emissiveIntensity = (finish.emissiveIntensity ?? 0) + Math.max(0, swell - 1) * 9;
    }
  });

  const args = finish.args.map((n) => n * toy.radius) as [number, number, number];

  return (
    <RigidBody
      ref={body}
      position={toy.position}
      rotation={toy.rotation}
      angularVelocity={toy.spin}
      colliders={false}
      ccd
      linearDamping={0.14}
      angularDamping={0.18}
      onCollisionEnter={(payload) => {
        const self = payload.target.rigidBody;
        const other = payload.other.rigidBody;
        if (!self) return;
        const selfMeta = self.userData as Meta | undefined;
        if (!selfMeta?.toy) return;
        const otherMeta = other?.userData as Meta | undefined;
        const otherToy = otherMeta?.toy ? otherMeta : null;
        if (otherToy && other && other.handle < self.handle) return;
        const v1 = self.linvel();
        const v2 = other ? other.linvel() : { x: 0, y: 0, z: 0 };
        const rel = Math.hypot(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z);
        const p = self.translation();
        audio.impact(
          selfMeta,
          otherToy,
          rel,
          { x: p.x, y: p.y, z: p.z },
          other ? `${Math.min(self.handle, other.handle)}:${Math.max(self.handle, other.handle)}` : `wall:${self.handle}`,
        );
      }}
    >
      {finish.collider === "ball" ? (
        <BallCollider args={[args[0] ?? toy.radius]} density={finish.density} friction={finish.friction} restitution={finish.restitution} contactSkin={0.002} />
      ) : null}
      {finish.collider === "cuboid" ? (
        <CuboidCollider args={[args[0] ?? toy.radius, args[1] ?? toy.radius, args[2] ?? toy.radius]} density={finish.density} friction={finish.friction} restitution={finish.restitution} contactSkin={0.002} />
      ) : null}
      {finish.collider === "cylinder" ? (
        <CylinderCollider args={[args[0] ?? toy.radius, args[1] ?? toy.radius]} density={finish.density} friction={finish.friction} restitution={finish.restitution} contactSkin={0.002} />
      ) : null}
      {finish.collider === "cone" ? (
        <ConeCollider args={[args[0] ?? toy.radius, args[1] ?? toy.radius]} density={finish.density} friction={finish.friction} restitution={finish.restitution} contactSkin={0.002} />
      ) : null}
      {finish.collider === "capsule" ? (
        <CapsuleCollider args={[args[0] ?? toy.radius, args[1] ?? toy.radius]} density={finish.density} friction={finish.friction} restitution={finish.restitution} contactSkin={0.002} />
      ) : null}
      {finish.collider === "hull" && points ? (
        <ConvexHullCollider args={[points]} density={finish.density} friction={finish.friction} restitution={finish.restitution} contactSkin={0.002} />
      ) : null}
      <mesh
        ref={mesh}
        geometry={geo}
        castShadow
        receiveShadow
        onPointerDown={(e) => {
          if (!desktopRef.current) return;
          e.stopPropagation();
          audio.unlock();
          beginHold(toy.id);
        }}
        onPointerUp={() => endHold()}
        onPointerOver={() => {
          if (desktopRef.current) document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <meshPhysicalMaterial
          ref={mat}
          color={toy.color}
          roughness={finish.roughness}
          metalness={finish.metalness}
          clearcoat={finish.clearcoat ?? 0}
          clearcoatRoughness={finish.clearcoatRoughness ?? 0.4}
          transmission={transmission ? (finish.transmission ?? 0) : 0}
          thickness={finish.thickness ?? 0.5}
          ior={finish.ior ?? 1.5}
          emissive={finish.emissive ?? "#000000"}
          emissiveIntensity={finish.emissiveIntensity ?? 0}
          sheen={finish.sheen ?? 0}
          sheenColor={finish.sheenColor ?? finish.color}
          attenuationColor={finish.attenuationColor ?? finish.color}
          attenuationDistance={finish.attenuationDistance ?? 1}
          flatShading={finish.flat ?? false}
          envMapIntensity={finish.metalness > 0.5 ? 0.85 : 0.4}
        />
      </mesh>
      {toy.lit ? (
        <pointLight
          color={finish.emissive ?? finish.color}
          intensity={0.85 + Math.min(toy.radius, 1.2) * 1.1}
          distance={1.8 + toy.radius * 3.2}
          decay={2}
        />
      ) : null}
    </RigidBody>
  );
}

function Vapor({ puff }: { puff: Puff }) {
  const points = useRef<THREE.Points>(null);
  const ring = useRef<THREE.Mesh>(null);
  const count = puff.count;
  const positions = useMemo(() => {
    const data = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      data[i * 3] = puff.at[0];
      data[i * 3 + 1] = puff.at[1];
      data[i * 3 + 2] = puff.at[2];
    }
    return data;
  }, [count, puff.at]);
  const vel = useMemo(() => {
    const data = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 0.35 + Math.random() * 1.7;
      data[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      data[i * 3 + 1] = Math.abs(Math.cos(phi)) * speed + 0.55;
      data[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
    }
    return data;
  }, [count]);
  const life = useRef(0);

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    life.current += d;
    const attr = points.current?.geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
    if (!attr) return;
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] += vel[i * 3] * d;
      positions[i * 3 + 1] += vel[i * 3 + 1] * d;
      positions[i * 3 + 2] += vel[i * 3 + 2] * d;
      vel[i * 3 + 1] += 0.35 * d;
    }
    attr.needsUpdate = true;
    const mat = points.current?.material as THREE.PointsMaterial | undefined;
    if (mat) mat.opacity = Math.max(0, 1 - life.current / 0.95);
    if (ring.current) {
      const u = life.current / 0.48;
      ring.current.scale.setScalar(0.12 + Math.min(1, u) * (0.7 + puff.reach));
      const rm = ring.current.material as THREE.MeshBasicMaterial;
      rm.opacity = Math.max(0, 0.5 * (1 - u));
    }
  });

  return (
    <group>
      <points ref={points} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial color={puff.color} size={0.07} transparent opacity={0.9} depthWrite={false} sizeAttenuation />
      </points>
      <mesh ref={ring} position={puff.at} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1, 40]} />
        <meshBasicMaterial color={puff.color} transparent opacity={0.45} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Rain({
  room,
  tier,
  portrait,
  desktop,
}: {
  room: Room;
  tier: Tier;
  portrait: boolean;
  desktop: boolean;
}) {
  const [toys, setToys] = useState<Toy[]>([]);
  const [puffs, setPuffs] = useState<Puff[]>([]);
  const acc = useRef(0);
  const seq = useRef(1);
  const seeded = useRef(false);
  const busy = useRef(false);
  const roomRef = useRef(room);
  const tierRef = useRef(tier);
  const portraitRef = useRef(portrait);
  roomRef.current = room;
  tierRef.current = tier;
  portraitRef.current = portrait;

  useFrame((_, dt) => {
    const current = profile(tierRef.current);
    const cap = capFor(tierRef.current, portraitRef.current);
    if (!seeded.current) {
      seeded.current = true;
      const next: Toy[] = [];
      const n = Math.min(current.seed, cap);
      for (let i = 0; i < n; i += 1) {
        const toy = makeToy(seq.current, roomRef.current, next, tierRef.current, i * 0.42);
        seq.current += 1;
        next.push(toy);
      }
      setToys(next);
      return;
    }
    acc.current += dt;
    if (acc.current < current.interval || busy.current) return;
    acc.current = 0;
    busy.current = true;
    setToys((curr) => {
      busy.current = false;
      if (curr.length >= cap) return curr;
      const toy = makeToy(seq.current, roomRef.current, curr, tierRef.current, 0);
      seq.current += 1;
      return [...curr, toy];
    });
  });

  const remove = (puff: Puff) => {
    const count = profile(tierRef.current).vapor;
    setToys((curr) => curr.filter((toy) => toy.id !== puff.id));
    setPuffs((curr) => [...curr, { ...puff, count }]);
    window.setTimeout(() => {
      setPuffs((curr) => curr.filter((item) => item.id !== puff.id));
    }, 1100);
  };

  const seg = profile(tier).seg;
  const transmission = tier === "high" || tier === "ultra";

  return (
    <>
      {toys.map((toy) => (
        <ToyBody key={toy.id} toy={toy} seg={seg} desktop={desktop} transmission={transmission} onPopped={remove} />
      ))}
      {puffs.map((puff) => (
        <Vapor key={puff.id} puff={puff} />
      ))}
    </>
  );
}

function KeyLight({ room, shadows }: { room: Room; shadows: number }) {
  const light = useRef<THREE.DirectionalLight>(null);
  useEffect(() => {
    const l = light.current;
    if (!l) return;
    l.shadow.mapSize.set(shadows, shadows);
    l.shadow.map?.dispose();
    l.shadow.map = null;
    l.shadow.needsUpdate = true;
  }, [shadows]);

  return (
    <directionalLight
      ref={light}
      position={[0.8, room.height * 0.42, room.depth * 0.35]}
      intensity={2.35}
      castShadow
      shadow-bias={-0.00025}
      shadow-normalBias={0.045}
      shadow-mapSize-width={shadows}
      shadow-mapSize-height={shadows}
      shadow-camera-near={0.2}
      shadow-camera-far={room.height + room.depth + 8}
      shadow-camera-left={-room.width}
      shadow-camera-right={room.width}
      shadow-camera-top={room.height * 0.7}
      shadow-camera-bottom={-room.height * 0.7}
    />
  );
}

export function FallWorld({
  room,
  tier,
  portrait,
  desktop,
  onFps,
}: {
  room: Room;
  tier: Tier;
  portrait: boolean;
  desktop: boolean;
  onFps: (fps: number) => void;
}) {
  const spec = profile(tier);
  return (
    <>
      <color attach="background" args={["#e7e2d9"]} />
      <StudioEnv />
      <hemisphereLight args={["#f6f3ec", "#d9d0c4", 0.72]} />
      <ambientLight intensity={0.18} />
      <KeyLight room={room} shadows={spec.shadows} />
      <directionalLight position={[-2.4, room.height * 0.2, 1.2]} intensity={0.55} color="#f3f6fb" />
      <directionalLight position={[1.5, room.height * 0.1, -2]} intensity={0.38} color="#fff8ef" />
      <Physics
        gravity={[0, -22, 0]}
        timeStep={1 / 60}
        numSolverIterations={spec.iterations}
        numInternalPgsIterations={spec.pgs}
        maxCcdSubsteps={spec.ccd}
      >
        <SimRig room={room} onFps={onFps} />
        <Walls room={room} />
        <Rain room={room} tier={tier} portrait={portrait} desktop={desktop} />
      </Physics>
      {spec.bloom ? (
        <EffectComposer enableNormalPass={false} multisampling={tier === "ultra" ? 2 : 0}>
          <Bloom intensity={0.38} luminanceThreshold={1.15} luminanceSmoothing={0.22} mipmapBlur />
        </EffectComposer>
      ) : null}
    </>
  );
}
