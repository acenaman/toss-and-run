import { useRef, useState } from "react";
import type { Match } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Share2, Download, FileImage } from "lucide-react";
import { oversString } from "@/lib/scorer";
import { exportPdf, exportPng, shareScorecard } from "@/lib/export";
import { ballShortLabel } from "@/lib/store";

export function ScorecardView({ match }: { match: Match }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [tab, setTab] = useState<"0" | "1">("0");
  const filename = `${match.teams[0].name}_vs_${match.teams[1].name}`.replace(/\s+/g, "_");
  return (
    <div className="space-y-3">
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="secondary" onClick={() => shareScorecard(ref.current!, "Gully Cricket Scorecard", match.resultText ?? `${match.teams[0].name} vs ${match.teams[1].name}`)}><Share2 className="w-3 h-3 mr-1" />Share</Button>
        <Button size="sm" variant="secondary" onClick={() => exportPng(ref.current!, `${filename}.png`)}><FileImage className="w-3 h-3 mr-1" />PNG</Button>
        <Button size="sm" variant="secondary" onClick={() => exportPdf(ref.current!, `${filename}.pdf`)}><Download className="w-3 h-3 mr-1" />PDF</Button>
      </div>

      <div ref={ref} className="space-y-3 bg-background p-2">
        <Card className="p-3">
          <div className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">Gully Cricket Scorer</div>
          <div className="text-center text-lg font-display tracking-wider">{match.teams[0].name} vs {match.teams[1].name}</div>
          {match.resultText && <div className="text-center text-primary font-semibold mt-1">{match.resultText}</div>}
          <div className="text-center text-xs text-muted-foreground">{new Date(match.createdAt).toLocaleString()} · {match.settings.overs} ov{match.quick ? " · Quick match" : ""}</div>
          {match.manOfTheMatchId && (() => {
            const mom = match.teams.flatMap((t, ti) => t.players.map((p) => ({ ...p, ti }))).find((p) => p.id === match.manOfTheMatchId);
            if (!mom) return null;
            return (
              <div className="mt-2 text-center text-sm">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-3 py-1 border border-primary/30">
                  🏆 Man of the Match — <span className="font-semibold">{mom.name}</span> <span className="text-xs text-muted-foreground">({match.teams[mom.ti].name})</span>
                </span>
              </div>
            );
          })()}
        </Card>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="0">{match.teams[match.innings[0].battingTeamIndex].name} Inning</TabsTrigger>
            <TabsTrigger value="1">{match.teams[match.innings[1].battingTeamIndex].name} Inning</TabsTrigger>
          </TabsList>
          {[0, 1].map((i) => (
            <TabsContent key={i} value={String(i)} className="space-y-3 mt-3">
              <InningsCard match={match} inn={match.innings[i]} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}

function InningsCard({ match, inn }: { match: Match; inn: Match["innings"][0] }) {
  const battingTeam = match.teams[inn.battingTeamIndex];
  const bowlingTeam = match.teams[inn.bowlingTeamIndex];
  const lookupName = (id: string) => {
    for (const t of match.teams) {
      const p = t.players.find((x) => x.id === id); if (p) return p.name;
    }
    return id === "__rk__" ? match.rules.relluKattaName ?? "Rellu Katta" : "—";
  };

  // group balls into overs
  const overs: Match["innings"][0]["balls"][] = [];
  for (const b of inn.balls) {
    if (!overs[b.overNumber]) overs[b.overNumber] = [];
    overs[b.overNumber].push(b);
  }

  return (
    <>
      <Card className="p-3">
        <div className="flex justify-between items-baseline">
          <div className="font-display text-2xl">{battingTeam.name}</div>
          <div className="font-mono text-xl">{inn.totalRuns}/{inn.totalWickets} <span className="text-sm text-muted-foreground">({oversString(inn.legalBalls)} ov)</span></div>
        </div>
      </Card>

      <Card className="p-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Batting</div>
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-muted-foreground"><th className="text-left">Batter</th><th className="text-right">R</th><th className="text-right">B</th><th className="text-right">4s</th><th className="text-right">6s</th><th className="text-right">SR</th></tr></thead>
          <tbody>
            {inn.battingOrder.map((id) => {
              const b = inn.batters[id];
              const sr = b.balls > 0 ? (b.runs / b.balls) * 100 : 0;
              return (
                <tr key={id} className="border-t border-border/40">
                  <td className="py-1">
                    <div>{lookupName(id)}</div>
                    <div className="text-[10px] text-muted-foreground">{b.out ? b.dismissal : b.retired ? "retired" : "not out"}</div>
                  </td>
                  <td className="text-right font-mono">{b.runs}</td>
                  <td className="text-right font-mono">{b.balls}</td>
                  <td className="text-right font-mono">{b.fours}</td>
                  <td className="text-right font-mono">{b.sixes}</td>
                  <td className="text-right font-mono">{sr.toFixed(1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card className="p-3 text-xs">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Extras</div>
        <div>Wides: {inn.extras.wides} · No-balls: {inn.extras.noBalls} · Byes: {inn.extras.byes} · Leg-byes: {inn.extras.legByes} · Penalty: {inn.extras.penalty}</div>
      </Card>

      <Card className="p-3 text-xs">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Fall of wickets</div>
        {inn.fallOfWickets.length === 0 ? <div className="text-muted-foreground">—</div> :
          <div className="space-y-0.5">
            {inn.fallOfWickets.map((f) => (
              <div key={f.wicketNumber} className="flex justify-between">
                <span>{f.wicketNumber}. {lookupName(f.batsmanOutId)}</span>
                <span className="font-mono">{f.runs} ({f.overs})</span>
              </div>
            ))}
          </div>
        }
      </Card>

      <Card className="p-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Bowling — {bowlingTeam.name}</div>
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-muted-foreground"><th className="text-left">Bowler</th><th className="text-right">O</th><th className="text-right">R</th><th className="text-right">W</th><th className="text-right">Econ</th></tr></thead>
          <tbody>
            {Object.values(inn.bowlers).map((b) => (
              <tr key={b.playerId} className="border-t border-border/40">
                <td className="py-1">{lookupName(b.playerId)}</td>
                <td className="text-right font-mono">{oversString(b.ballsBowled)}</td>
                <td className="text-right font-mono">{b.runsConceded}</td>
                <td className="text-right font-mono">{b.wickets}</td>
                <td className="text-right font-mono">{b.ballsBowled > 0 ? ((b.runsConceded / b.ballsBowled) * 6).toFixed(2) : "0.00"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="p-3 text-xs">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Per-over balls</div>
        {overs.length === 0 && <div className="text-muted-foreground">No balls bowled</div>}
        <div className="space-y-1">
          {overs.map((ovBalls, i) => (
            <div key={i} className="flex gap-1 items-center">
              <span className="text-muted-foreground font-mono w-7">Ov{i + 1}</span>
              <div className="flex flex-wrap gap-1">
                {ovBalls.map((b) => (
                  <span key={b.id} className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${b.wicket ? "bg-destructive text-destructive-foreground" : b.extraType ? "bg-warning text-warning-foreground" : b.runs === 4 ? "bg-accent text-accent-foreground" : b.runs === 6 ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{ballShortLabel(b)}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
