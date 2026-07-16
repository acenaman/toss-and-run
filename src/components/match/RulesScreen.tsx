import { useState } from "react";
import { useApp, DEFAULT_RULES } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Plus, Minus } from "lucide-react";
import type { MatchRules } from "@/lib/types";
import { toast } from "sonner";

export function RulesScreen() {
  const match = useApp((s) => s.matches.find((m) => m.id === s.activeMatchId)!);
  const updateMatch = useApp((s) => s.updateMatch);
  const isQuick = !!match.quick;
  const [r, setR] = useState<MatchRules>(match.rules ?? DEFAULT_RULES);
  const [captainT1, setCaptainT1] = useState<string>(match.teams[0].captainId ?? match.teams[0].players[0]?.id ?? "");
  const [keeperT1, setKeeperT1] = useState<string>(match.teams[0].wicketkeeperId ?? match.teams[0].players[0]?.id ?? "");
  const [captainT2, setCaptainT2] = useState<string>(match.teams[1].captainId ?? match.teams[1].players[0]?.id ?? "");
  const [keeperT2, setKeeperT2] = useState<string>(match.teams[1].wicketkeeperId ?? match.teams[1].players[0]?.id ?? "");

  const Step = ({ label, value, set, min, max, allowUnlimited }: { label: string; value: number | null; set: (v: number | null) => void; min: number; max: number; allowUnlimited?: boolean; }) => (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-1">
        {allowUnlimited && <Button size="sm" variant={value === null ? "default" : "secondary"} onClick={() => set(value === null ? min : null)}>∞</Button>}
        <Button size="icon" variant="secondary" onClick={() => set(Math.max(min, (value ?? min) - 1))} disabled={value === null}><Minus className="w-3 h-3" /></Button>
        <span className="font-mono w-10 text-center font-semibold">{value === null ? "∞" : value}</span>
        <Button size="icon" variant="secondary" onClick={() => set(Math.min(max, (value ?? min) + 1))} disabled={value === null}><Plus className="w-3 h-3" /></Button>
      </div>
    </div>
  );
  const Toggle = ({ label, value, set }: { label: string; value: boolean; set: (v: boolean) => void }) => (
    <div className="flex items-center justify-between">
      <span className="text-sm pr-3">{label}</span>
      <Switch checked={value} onCheckedChange={set} />
    </div>
  );

  const submit = () => {
    const finalRules: MatchRules = {
      ...r,
      relluKattaName: r.relluKattaEnabled
        ? (isQuick ? (r.relluKattaName?.trim() || "Player C") : r.relluKattaName?.trim())
        : r.relluKattaName,
    };
    if (finalRules.relluKattaEnabled && !finalRules.relluKattaName) {
      toast.error("Name the Rellu Katta player");
      return;
    }
    const teams = match.teams.map((team, index) => ({
      ...team,
      captainId: isQuick ? team.captainId ?? team.players[0]?.id : (index === 0 ? captainT1 : captainT2),
      wicketkeeperId: isQuick ? team.wicketkeeperId ?? team.players[0]?.id : (index === 0 ? keeperT1 : keeperT2),
    })) as typeof match.teams;
    updateMatch({ ...match, rules: finalRules, teams, needsRules: false });
    toast.success("Rules saved — proceed to toss");
  };

  return (
    <div className="space-y-3 pb-4">
      <h2 className="text-2xl">Match Rules</h2>

      <h2 className="text-2xl">Match Rules</h2>

      {!isQuick && (
        <Card className="p-4 space-y-3">
          <div className="text-sm font-semibold text-primary uppercase tracking-wider">Captains & Keepers</div>
          {([0, 1] as const).map((i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <div className="col-span-2 text-xs text-muted-foreground">{match.teams[i].name}</div>
              <select value={i === 0 ? captainT1 : captainT2} onChange={(e) => i === 0 ? setCaptainT1(e.target.value) : setCaptainT2(e.target.value)} className="bg-input rounded-md px-2 py-2 text-sm">
                {match.teams[i].players.map((p) => <option key={p.id} value={p.id}>👑 {p.name}</option>)}
              </select>
              <select value={i === 0 ? keeperT1 : keeperT2} onChange={(e) => i === 0 ? setKeeperT1(e.target.value) : setKeeperT2(e.target.value)} className="bg-input rounded-md px-2 py-2 text-sm">
                {match.teams[i].players.map((p) => <option key={p.id} value={p.id}>🧤 {p.name}</option>)}
              </select>
            </div>
          ))}
        </Card>
      )}

      <Card className="p-4 space-y-2">
        <div className="text-sm font-semibold text-primary uppercase tracking-wider">Extras</div>
        <Step label="Wide runs" value={r.wideRuns} set={(v) => setR({ ...r, wideRuns: v as number })} min={0} max={5} />
        <Step label="No-ball runs" value={r.noBallRuns} set={(v) => setR({ ...r, noBallRuns: v as number })} min={0} max={5} />
      </Card>

      <Card className="p-4 space-y-2">
        <div className="text-sm font-semibold text-primary uppercase tracking-wider">Bowling Rules</div>
        <Toggle label="Free hit after no-ball" value={r.freeHitAfterNoBall} set={(v) => setR({ ...r, freeHitAfterNoBall: v })} />
        <Toggle label="Mini-Check (3-ball spell option)" value={r.miniCheck} set={(v) => setR({ ...r, miniCheck: v })} />
        <Step label="Over limit per bowler" value={r.overLimit} set={(v) => setR({ ...r, overLimit: v })} min={1} max={100} allowUnlimited />
      </Card>

      <Card className="p-4 space-y-2">
        <div className="text-sm font-semibold text-primary uppercase tracking-wider">Special Gully Rules</div>
        <Toggle label="Tip and Run" value={r.tipAndRun} set={(v) => setR({ ...r, tipAndRun: v })} />
        <Toggle label="One Hand One Bounce catch" value={r.oneHandOneBounce} set={(v) => setR({ ...r, oneHandOneBounce: v })} />
        <Toggle label="Last ball of every over = free hit" value={r.lastBallFreeHit} set={(v) => setR({ ...r, lastBallFreeHit: v })} />
      </Card>

      <Card className="p-4 space-y-2">
        <div className="text-sm font-semibold text-primary uppercase tracking-wider">Batting Rules</div>
        <Toggle label="Non-striker (2 batters at crease)" value={r.nonStriker} set={(v) => setR({ ...r, nonStriker: v })} />
        <Toggle label="Retired batsman can return" value={r.retiredCanReturn} set={(v) => setR({ ...r, retiredCanReturn: v })} />
        <Toggle label="Single person can bat (after all out)" value={r.singlePersonCanBat} set={(v) => setR({ ...r, singlePersonCanBat: v })} />
      </Card>

      <Card className="p-4 space-y-2">
        <div className="text-sm font-semibold text-primary uppercase tracking-wider">Rellu-Katta Player</div>
        <Toggle label="Enable Rellu-Katta (shared bat & bowl)" value={r.relluKattaEnabled} set={(v) => setR({ ...r, relluKattaEnabled: v })} />
        {r.relluKattaEnabled && (
          isQuick
            ? <div className="text-xs text-muted-foreground px-1">Named automatically: <span className="font-semibold text-foreground">Player C</span></div>
            : <Input value={r.relluKattaName ?? ""} onChange={(e) => setR({ ...r, relluKattaName: e.target.value })} placeholder="Rellu Katta player name" />
        )}
      </Card>

      <Card className="p-4 space-y-1.5 text-sm">
        <div className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Summary</div>
        <SummaryLine k="Wide" v={`+${r.wideRuns} run${r.wideRuns === 1 ? "" : "s"}`} />
        <SummaryLine k="No Ball" v={`+${r.noBallRuns}${r.freeHitAfterNoBall ? " + Free Hit" : ""}`} />
        <SummaryLine k="Free hit (last ball)" v={r.lastBallFreeHit ? "Yes" : "No"} />
        <SummaryLine k="Mini-Check" v={r.miniCheck ? "Yes" : "No"} />
        <SummaryLine k="Over limit / bowler" v={r.overLimit === null ? "Unlimited" : `${r.overLimit}`} />
        <SummaryLine k="Tip and Run" v={r.tipAndRun ? "Yes" : "No"} />
        <SummaryLine k="One Hand One Bounce" v={r.oneHandOneBounce ? "Yes" : "No"} />
        <SummaryLine k="Non-striker" v={r.nonStriker ? "On" : "Off"} />
        <SummaryLine k="Retired returns" v={r.retiredCanReturn ? "Yes" : "No"} />
        <SummaryLine k="Single can bat" v={r.singlePersonCanBat ? "Yes" : "No"} />
        <SummaryLine k="Rellu-Katta" v={r.relluKattaEnabled ? r.relluKattaName ?? "On" : "Off"} />
      </Card>

      <Button className="w-full h-12 text-base" onClick={submit}>Match Toss →</Button>
    </div>
  );
}

function SummaryLine({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-border/40 last:border-0 py-1">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-semibold">{v}</span>
    </div>
  );
}
