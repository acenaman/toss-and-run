import { useState } from "react";
import { useApp } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Player } from "@/lib/types";

export function OpenersScreen() {
  const match = useApp((s) => s.matches.find((m) => m.id === s.activeMatchId)!);
  const setOpeners = useApp((s) => s.setOpeners);
  const startSecondInnings = useApp((s) => s.startSecondInnings);

  const inn = match.innings[match.currentInningsIndex];
  const battingTeam = match.teams[inn.battingTeamIndex];
  const bowlingTeam = match.teams[inn.bowlingTeamIndex];
  const usedBatters = new Set([
    ...Object.keys(inn.batters).filter((id) => inn.batters[id].out || inn.batters[id].retired),
  ]);
  const remainingBatters = battingTeam.players.filter((p) => !usedBatters.has(p.id));
  const battersPool: Player[] = [...remainingBatters];
  if (match.rules.relluKattaEnabled && match.rules.relluKattaName && match.rk?.currentBattingTeam !== (inn.battingTeamIndex === 0 ? 1 : 0)) {
    // Allow rellu-katta to bat if not already batting for opposite team
    battersPool.push({ id: "__rk__", name: `🪅 ${match.rules.relluKattaName} (Rellu Katta)` });
  }

  const [striker, setStriker] = useState<string>(inn.currentStrikerId ?? remainingBatters[0]?.id ?? "");
  const [nonStriker, setNonStriker] = useState<string>(inn.currentNonStrikerId ?? remainingBatters[1]?.id ?? "");
  const [bowler, setBowler] = useState<string>(inn.currentBowlerId ?? bowlingTeam.players[0]?.id ?? "");
  const [keeper, setKeeper] = useState<string>(inn.wicketkeeperId ?? bowlingTeam.wicketkeeperId ?? bowlingTeam.players[0]?.id ?? "");

  const isFirstInnings = match.currentInningsIndex === 0;
  const empty = inn.balls.length === 0 && !inn.currentStrikerId && !inn.currentBowlerId;

  const submit = () => {
    if (!striker || !bowler || !keeper) return;
    if (match.rules.nonStriker && (!nonStriker || nonStriker === striker)) return;
    if (isFirstInnings) {
      setOpeners(striker, match.rules.nonStriker ? nonStriker : undefined, bowler, keeper);
    } else if (empty) {
      startSecondInnings(striker, match.rules.nonStriker ? nonStriker : undefined, bowler, keeper);
    } else {
      // Just filling missing positions mid-innings
      setOpeners(striker, match.rules.nonStriker ? nonStriker : undefined, bowler, keeper);
    }
  };

  const title = isFirstInnings ? "Openers" : empty ? "2nd Innings Openers" : "Resume Innings";

  return (
    <div className="space-y-3 pb-4">
      <h2 className="text-2xl">{title}</h2>
      {!isFirstInnings && empty && (
        <Card className="p-3 text-sm bg-accent/10 border-accent/30">
          Innings break — target: <b>{match.innings[0].totalRuns + 1}</b> in {match.settings.overs} overs.
        </Card>
      )}
      <Card className="p-4 space-y-3">
        <div className="text-sm text-muted-foreground">🏏 Batting — {battingTeam.name}</div>
        <Select label="Striker" value={striker} onChange={setStriker} options={battersPool} exclude={[nonStriker]} />
        {match.rules.nonStriker && (
          <Select label="Non-Striker" value={nonStriker} onChange={setNonStriker} options={battersPool} exclude={[striker]} />
        )}
      </Card>
      <Card className="p-4 space-y-3">
        <div className="text-sm text-muted-foreground">🎯 Bowling — {bowlingTeam.name}</div>
        <Select label="Opening Bowler" value={bowler} onChange={setBowler} options={bowlingTeam.players} exclude={[]} />
        <Select label="Wicketkeeper" value={keeper} onChange={setKeeper} options={bowlingTeam.players} exclude={[]} />
      </Card>
      <Button className="w-full h-12" onClick={submit} disabled={!striker || !bowler || !keeper || (match.rules.nonStriker && (!nonStriker || nonStriker === striker))}>Start Scoring</Button>
    </div>
  );
}

function Select({ label, value, onChange, options, exclude }: { label: string; value: string; onChange: (v: string) => void; options: Player[]; exclude: string[]; }) {
  return (
    <label className="block">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-input rounded-md px-3 py-2 w-full text-sm">
        <option value="">— select —</option>
        {options.filter((p) => !exclude.includes(p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </label>
  );
}
