import { useEffect, useMemo, useState } from "react";
import { Info, Volume2, VolumeX } from "lucide-react";
import { groupConstraints, solveChrome, type Insets } from "@/fidget/gss";
import type { Tier } from "@/fidget/quality";

type Props = {
  muted: boolean;
  onToggleMute: () => void;
  portrait: boolean;
  motion: boolean;
  onMotion: () => void;
  tier: Tier;
  sampleRate: number;
  voices: number;
};

function readInsets(el: Element): Insets {
  const cs = getComputedStyle(el);
  const num = (name: string) => {
    const n = parseFloat(cs.getPropertyValue(name));
    return Number.isFinite(n) ? n : 0;
  };
  return {
    top: num("--safe-top"),
    right: num("--safe-right"),
    bottom: num("--safe-bottom"),
    left: num("--safe-left"),
  };
}

export function Hud({ muted, onToggleMute, portrait, motion, onMotion, tier, sampleRate, voices }: Props) {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const [insets, setInsets] = useState<Insets>({ top: 0, right: 0, bottom: 0, left: 0 });
  const [logOn, setLogOn] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);

  useEffect(() => {
    const root = document.querySelector(".fallroom-root");
    const measure = () => {
      setSize({ w: window.innerWidth, h: window.innerHeight });
      if (root) setInsets(readInsets(root));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const sync = () => setLogOn(new URLSearchParams(window.location.search).get("log") === "1");
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    if (!logOn) return;
    const onClick = (event: MouseEvent) => {
      if (!event.altKey) return;
      const node = (event.target as Element | null)?.closest?.("[data-gss]");
      setFocus(node?.getAttribute("data-gss") ?? null);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [logOn]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const chrome = useMemo(
    () =>
      solveChrome({
        width: size.w,
        height: size.h,
        insets,
        panel: open,
        log: logOn,
        motion,
      }),
    [size, insets, open, logOn, motion],
  );

  const groups = useMemo(() => groupConstraints(chrome.constraints, focus), [chrome.constraints, focus]);
  const box = (b: { left: number; top: number; width: number; height: number }) => ({
    left: b.left,
    top: b.top,
    width: b.width,
    height: b.height,
  });

  return (
    <>
      <button
        type="button"
        className="fallroom-btn"
        data-gss="mute"
        style={box(chrome.mute)}
        aria-pressed={muted}
        aria-label={muted ? "Unmute" : "Mute"}
        onClick={onToggleMute}
      >
        {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>
      <button
        type="button"
        className="fallroom-btn"
        data-gss="info"
        style={box(chrome.info)}
        aria-expanded={open}
        aria-label="About Fallroom"
        onClick={() => setOpen((value) => !value)}
      >
        <Info size={20} />
      </button>
      {chrome.motion ? (
        <button type="button" className="fallroom-motion" data-gss="motion" style={box(chrome.motion)} onClick={onMotion}>
          Use motion
        </button>
      ) : null}
      {chrome.panel ? (
        <div className="fallroom-panel" data-gss="panel" style={{ left: chrome.panel.left, top: chrome.panel.top, width: chrome.panel.width }}>
          <p className="fallroom-credit">
            made in SF with {"<3"} by <a href="https://maxi.grok.me" target="_blank" rel="noreferrer">
                maxi.grok.me
              </a>{" "}
              and with{" "}
              <a
                href="https://gss.github.io/guides/tools"
                target="_blank"
                rel="noreferrer"
                title="GSS tools — logger, VFL to CCSS, CCSS to AST"
              >
                GSS
              </a>
          </p>
        </div>
      ) : null}
      <p className="fallroom-hint" data-gss="hint" style={box(chrome.hint)}>
        {portrait ? "Tilt the phone. The pile slides to the low side." : "Move to tilt the room. Hold a toy until it pops."}
      </p>
      {chrome.log ? (
        <div className="fallroom-log" data-gss="log" style={box(chrome.log)}>
          <h2>
            GSS log · {groups.length} {groups.length === 1 ? "group" : "groups"}
            {focus ? ` · ${focus}` : ""}
          </h2>
          <p>
            tier {tier} · {voices} voices · {sampleRate} Hz · alt-click an element
          </p>
          <p>
            <a href="https://gss.github.io/guides/tools">gss.github.io/guides/tools</a>
            {" · "}
            <a href="https://github.com/gss/engine">gss/engine</a>
          </p>
          {groups.map(([property, rows]) => (
            <section key={property}>
              <p>
                {property} ({rows.length})
              </p>
              {rows.map((row) => (
                <p key={row.id}>
                  {row.expr} = {row.value}
                </p>
              ))}
            </section>
          ))}
        </div>
      ) : null}
    </>
  );
}
