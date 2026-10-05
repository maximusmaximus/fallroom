import { tilt } from "@/fidget/tilt";

const HOLD_MS = 850;

export const gesture = {
  id: -1,
  from: 0,
  active: false,
  popped: false,
  releaseScale: 1,
  releasedAt: 0,
  returning: false,
};

export function holdMs() {
  return HOLD_MS;
}

export function beginHold(id: number) {
  gesture.id = id;
  gesture.from = performance.now();
  gesture.active = true;
  gesture.popped = false;
  gesture.returning = false;
  tilt.freeze = true;
}

export function endHold() {
  tilt.freeze = false;
  if (!gesture.active || gesture.popped) return;
  const t = Math.min(1, (performance.now() - gesture.from) / HOLD_MS);
  const k = t * t * (3 - 2 * t);
  gesture.active = false;
  gesture.releaseScale = 1 + 0.25 * k;
  gesture.releasedAt = performance.now();
  gesture.returning = true;
}

export function markPopped() {
  gesture.active = false;
  gesture.popped = true;
  gesture.returning = false;
  gesture.id = -1;
  tilt.freeze = false;
}
