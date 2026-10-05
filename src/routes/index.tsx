import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [view, setView] = useState<ReactNode>(null);

  useEffect(() => {
    let live = true;
    void import("@/fidget/FidgetApp").then((mod) => {
      if (live) setView(<mod.FidgetApp />);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <main className="fallroom-root">
      {view ?? <p className="fallroom-hint fallroom-hint-boot">Tilt the phone. The pile slides to the low side.</p>}
    </main>
  );
}
