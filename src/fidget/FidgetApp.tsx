import { Canvas } from "@react-three/fiber";
import { Component, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import * as THREE from "three";
import { audio } from "@/fidget/audio";
import { endHold } from "@/fidget/gesture";
import { Hud } from "@/fidget/Hud";
import { detectDevice, profile, stepTier, type Tier } from "@/fidget/quality";
import { FallWorld, roomFor } from "@/fidget/scene";
import { bindTilt, motionNeedsGesture, requestMotion } from "@/fidget/tilt";

class ViewBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state = { message: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { message: error.message };
  }

  render() {
    if (this.state.message) return <p className="fallroom-error">{this.state.message}</p>;
    return this.props.children;
  }
}

export function FidgetApp() {
  const device = useMemo(() => detectDevice(), []);
  const ceiling: Tier = device.software ? "low" : "ultra";
  const [tier, setTier] = useState<Tier>(device.tier);
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const [muted, setMuted] = useState(false);
  const [motion, setMotion] = useState(false);
  const [rate, setRate] = useState(profile(device.tier).sampleRate);

  useEffect(() => {
    audio.configure(tier);
    setRate(audio.ctx?.sampleRate ?? profile(tier).sampleRate);
  }, [tier]);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches && motionNeedsGesture()) setMotion(true);
    const saved = window.localStorage.getItem("fallroom-muted");
    if (saved === "1") {
      setMuted(true);
      audio.setMuted(true);
    }
    const unbind = bindTilt(window);
    const unlock = () => {
      audio.unlock();
      setRate(audio.sampleRate());
    };
    const onUp = () => endHold();
    const onVisible = () => {
      if (document.visibilityState === "visible") audio.unlock();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    document.addEventListener("visibilitychange", onVisible);
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => {
      unbind();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("resize", onResize);
      document.body.style.cursor = "";
    };
  }, []);

  const onFps = useCallback(
    (fps: number) => {
      setTier((current) => {
        if (fps < 36) return stepTier(current, -1, ceiling);
        if (fps > 57) return stepTier(current, 1, ceiling);
        return current;
      });
    },
    [ceiling],
  );

  const toggleMute = () => {
    audio.unlock();
    setMuted((current) => {
      const next = !current;
      audio.setMuted(next);
      window.localStorage.setItem("fallroom-muted", next ? "1" : "0");
      setRate(audio.sampleRate());
      return next;
    });
  };

  const enableMotion = () => {
    audio.unlock();
    void requestMotion().then((ok) => {
      if (ok) setMotion(false);
    });
  };

  const portrait = vp.h >= vp.w;
  const desktop = vp.w >= 900 && vp.w > vp.h;
  const room = roomFor(vp.w, vp.h);
  const spec = profile(tier);

  return (
    <>
      <ViewBoundary>
        <Suspense fallback={<div className="fallroom-boot" />}>
          <Canvas
            className="fallroom-canvas"
            shadows
            dpr={spec.dpr}
            camera={{ fov: 54, position: [0, 0, 8], near: 0.08, far: 80 }}
            gl={{
              antialias: !spec.bloom,
              alpha: false,
              powerPreference: "high-performance",
              toneMapping: THREE.ACESFilmicToneMapping,
              outputColorSpace: THREE.SRGBColorSpace,
            }}
            onCreated={({ gl }) => {
              gl.toneMappingExposure = 1.05;
            }}
          >
            <FallWorld room={room} tier={tier} portrait={portrait} desktop={desktop} onFps={onFps} />
          </Canvas>
        </Suspense>
      </ViewBoundary>
      <Hud
        muted={muted}
        onToggleMute={toggleMute}
        portrait={portrait}
        motion={motion}
        onMotion={enableMotion}
        tier={tier}
        sampleRate={rate}
        voices={spec.voices}
      />
    </>
  );
}
