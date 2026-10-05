/** Smoothed view + gravity angles in radians. Device pose wins on touch screens. */
export const tilt = {
  roll: 0,
  pitch: 0,
  smoothRoll: 0,
  smoothPitch: 0,
  device: false,
  freeze: false,
};

const MAX_ROLL = 1.05;
const MAX_PITCH = 0.95;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function bindTilt(target: Window) {
  const coarse = target.matchMedia("(pointer: coarse)").matches;

  const onMove = (e: PointerEvent) => {
    if (tilt.device || tilt.freeze || e.pointerType === "touch" || e.buttons) return;
    const nx = (e.clientX / Math.max(target.innerWidth, 1)) * 2 - 1;
    const ny = (e.clientY / Math.max(target.innerHeight, 1)) * 2 - 1;
    tilt.roll = clamp(nx * 0.95, -MAX_ROLL, MAX_ROLL);
    tilt.pitch = clamp(ny * 0.78, -MAX_PITCH, MAX_PITCH);
  };

  const onDevice = (e: DeviceOrientationEvent) => {
    if (!coarse || e.beta == null || e.gamma == null) return;
    tilt.device = true;
    const pitch = ((e.beta - 90) * Math.PI) / 180;
    const roll = (e.gamma * Math.PI) / 180;
    tilt.roll = clamp(roll, -MAX_ROLL, MAX_ROLL);
    tilt.pitch = clamp(pitch, -MAX_PITCH, MAX_PITCH);
  };

  target.addEventListener("pointermove", onMove, { passive: true });
  target.addEventListener("deviceorientation", onDevice);
  return () => {
    target.removeEventListener("pointermove", onMove);
    target.removeEventListener("deviceorientation", onDevice);
  };
}

export async function requestMotion(): Promise<boolean> {
  const DOE = DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<PermissionState | string>;
  };
  if (typeof DOE.requestPermission !== "function") return true;
  try {
    const result = await DOE.requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
}

export function motionNeedsGesture(): boolean {
  const DOE = DeviceOrientationEvent as unknown as { requestPermission?: unknown };
  return typeof DOE.requestPermission === "function";
}
