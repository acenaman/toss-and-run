import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScorecardView } from "./ScorecardView";
import { useNavigate } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import type { Match } from "@/lib/types";
import { toast } from "sonner";

export function SummaryScreen() {
  const match = useApp((s) => s.matches.find((m) => m.id === s.activeMatchId)!);
  const finishMatch = useApp((s) => s.finishMatch);
  const setActive = useApp((s) => s.setActive);
  const navigate = useNavigate();

  // Quick match: fast-forward to history with auto-picked MOM already applied.
  useEffect(() => {
    if (!match.quick) return;
    finishMatch(match.manOfTheMatchId, match.manOfTheMatchTeamIndex);
    setActive(null);
    navigate({ to: "/history" });
    toast.success("Quick match saved");
  }, [match.quick, match.manOfTheMatchId, match.manOfTheMatchTeamIndex, finishMatch, setActive, navigate]);

  return (
    <MatchSummaryView match={match} onDone={() => {
      finishMatch(match.manOfTheMatchId, match.manOfTheMatchTeamIndex);
      setActive(null);
      navigate({ to: "/history" });
      toast.success("Match saved");
    }} />
  );
}

export function MatchSummaryView({ match, onDone, embedded }: { match: Match; onDone?: () => void; embedded?: boolean }) {
  const [show, setShow] = useState(false);
  const allPlayers = useMemo(() => {
    const arr: { id: string; name: string; teamIndex: 0 | 1 }[] = [];
    match.teams.forEach((t, ti) => t.players.forEach((p) => arr.push({ id: p.id, name: p.name, teamIndex: ti as 0 | 1 })));
    return arr;
  }, [match]);
  const [momId, setMomId] = useState<string>(match.manOfTheMatchId ?? "");

  const winnerIdx = match.winnerIndex ?? -1;
  return (
    <div className="space-y-3 pb-4">
      <h2 className="text-2xl text-center">{match.resultText ?? "Match Complete"}</h2>
      <div className="grid grid-cols-2 gap-2">
        {match.teams.map((t, i) => {
          const inn = match.innings.find((x) => x.battingTeamIndex === i);
          const isWinner = winnerIdx === i;
          return (
            <Card key={i} className={`p-3 ${isWinner ? "border-success bg-success/15" : ""}`}>
              <div className="text-xs uppercase text-muted-foreground">{isWinner ? "Winner 🏆" : "—"}</div>
              <div className="font-display text-xl">{t.name}</div>
              <div className="font-mono">{inn?.totalRuns ?? 0}/{inn?.totalWickets ?? 0}</div>
            </Card>
          );
        })}
      </div>

      {!embedded && (
        <Card className="p-3 space-y-2">
          <div className="flex items-center gap-2"><Trophy className="w-4 h-4 text-primary" /><div className="text-sm font-semibold">Man of the Match</div></div>
          <select value={momId} onChange={(e) => setMomId(e.target.value)} className="w-full bg-input rounded-md px-2 py-2 text-sm">
            <option value="">— select —</option>
            {allPlayers.map((p) => <option key={p.id} value={p.id}>{p.name} ({match.teams[p.teamIndex].name})</option>)}
          </select>
        </Card>
      )}

      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => setShow(true)}>Full Scorecard</Button>
        {onDone && (
          <Button className="flex-1" onClick={() => {
            const p = allPlayers.find((x) => x.id === momId);
            if (p) { match.manOfTheMatchId = p.id; match.manOfTheMatchTeamIndex = p.teamIndex; }
            onDone();
          }}>Save & Finish</Button>
        )}
      </div>

      {show && (
        <div className="border-t border-border pt-3">
          <ScorecardView match={match} />
        </div>
      )}
      {embedded && <ScorecardView match={match} />}
    </div>
  );
}
