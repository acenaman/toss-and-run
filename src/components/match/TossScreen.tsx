import { useState } from "react";
import { useApp } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function TossScreen() {
  const match = useApp((s) => s.matches.find((m) => m.id === s.activeMatchId)!);
  const setToss = useApp((s) => s.setToss);

  const [caller, setCaller] = useState<0 | 1 | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [result, setResult] = useState<"H" | "T" | null>(null);
  const [winner, setWinner] = useState<0 | 1 | null>(null);
  const [decision, setDecision] = useState<"bat" | "bowl" | null>(null);

  const flip = () => {
    if (caller === null) return;
    setFlipping(true); setResult(null);
    setTimeout(() => {
      const r: "H" | "T" = Math.random() < 0.5 ? "H" : "T";
      setResult(r);
      setFlipping(false);
      const calledHeads = caller;
      const won: 0 | 1 = r === "H" ? calledHeads : (calledHeads === 0 ? 1 : 0);
      setWinner(won);
    }, 2200);
  };

  const confirm = () => {
    if (winner === null || !decision) return;
    setToss(winner, decision);
  };

  return (
    <div className="space-y-3 pb-4">
      <h2 className="text-2xl">Match Toss</h2>

      <Card className="p-5 space-y-4">
        <div className="text-sm text-center text-muted-foreground">Who calls HEAD?</div>
        <div className="grid grid-cols-2 gap-2">
          {match.teams.map((t, i) => (
            <Button key={i} variant={caller === i ? "default" : "secondary"} onClick={() => { setCaller(i as 0 | 1); setResult(null); setWinner(null); setDecision(null); }} className="h-12">
              {t.name}
            </Button>
          ))}
        </div>

        <div className="flex justify-center py-8">
          <div className={`relative w-32 h-32 ${flipping ? "animate-coin-flip" : ""}`} style={{ ["--final-rot" as any]: result === "H" ? "3600deg" : "3780deg" }}>
            <div className="coin-face bg-primary text-primary-foreground border-4 border-primary-foreground/20">{result ?? "?"}</div>
          </div>
        </div>

        <Button className="w-full h-12" onClick={flip} disabled={caller === null || flipping}>
          {flipping ? "Flipping…" : "Flip Coin"}
        </Button>
      </Card>

      {winner !== null && (
        <Card className="p-4 space-y-3">
          <div className="text-center">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Toss winner</div>
            <div className="text-xl font-bold text-primary">{match.teams[winner].name}</div>
          </div>
          <div className="text-sm text-center">Choose to:</div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant={decision === "bat" ? "default" : "secondary"} onClick={() => setDecision("bat")} className="h-12">🏏 Bat</Button>
            <Button variant={decision === "bowl" ? "default" : "secondary"} onClick={() => setDecision("bowl")} className="h-12">🎯 Bowl</Button>
          </div>
          <Button className="w-full h-12" onClick={confirm} disabled={!decision}>Start Match</Button>
        </Card>
      )}
    </div>
  );
}
