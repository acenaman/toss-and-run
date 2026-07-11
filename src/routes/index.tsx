import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useEffect, useState } from "react";

import logoAsset from "@/assets/logo.png.asset.json";

import { useApp } from "@/lib/store";



export const Route = createFileRoute("/")({

  component: Splash,

});



function Splash() {

  const navigate = useNavigate();

  const hydrate = useApp((s) => s.hydrate);

  const activeId = useApp((s) => s.activeMatchId);

  const matches = useApp((s) => s.matches);

  const [ready, setReady] = useState(false);



  useEffect(() => {

    hydrate();

    const t = setTimeout(() => setReady(true), 1600);

    return () => clearTimeout(t);

  }, [hydrate]);



  useEffect(() => {

    if (!ready) return;

    // If there's an in-progress match, resume it.

    const live = activeId ? matches.find((m) => m.id === activeId && m.status === "in_progress") : null;

    navigate({ to: live ? "/match" : "/match" });

  }, [ready, activeId, matches, navigate]);



  return (

    <div className="min-h-screen w-full flex flex-col items-center justify-center gully-gradient stadium-grain">

      <img

        src="/logo-transparent.png"

        alt="Gully Cricket Scorer branding"

        className="w-44 h-44 object-contain animate-logo-spin drop-shadow-[0_0_30px_rgba(255,122,26,0.45)]"

      />

      <h1 className="mt-8 text-4xl tracking-wider text-foreground">GULLY CRICKET SCORER — Digital cricket scoring for local matches</h1>

      <p className="mt-2 text-sm text-muted-foreground uppercase tracking-[0.3em]">Mohalla ka maidan, apna scorecard</p>

    </div>

  );

}
