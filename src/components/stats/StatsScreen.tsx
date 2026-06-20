import { useMemo } from "react";
import { useApp } from "@/lib/store";
import { aggregateStats, leaderboards } from "@/lib/stats";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy } from "lucide-react";

export function StatsScreen() {
  const matches = useApp((s) => s.matches);
  const lb = useMemo(() => leaderboards(aggregateStats(matches)), [matches]);

  const Board = ({ title, items, valueLabel, value }: { title: string; items: any[]; valueLabel: string; value: (x: any) => string }) => (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-primary" />
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-muted-foreground">No data yet</div>
      ) : (
        <ol className="space-y-1.5">
          {items.slice(0, 5).map((p, i) => (
            <li key={p.name + i} className="flex justify-between text-sm">
              <span><span className="text-muted-foreground mr-2">{i + 1}.</span>{p.name}</span>
              <span className="font-mono text-primary">{value(p)}</span>
            </li>
          ))}
        </ol>
      )}
      <div className="text-[10px] text-muted-foreground mt-2">{valueLabel}</div>
    </Card>
  );

  return (
    <div className="space-y-3 pb-4">
      <h2 className="text-2xl">Stats</h2>
      <Tabs defaultValue="bat">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="bat">Bat</TabsTrigger>
          <TabsTrigger value="bowl">Bowl</TabsTrigger>
          <TabsTrigger value="field">Field</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>
        <TabsContent value="bat" className="space-y-3 mt-3">
          <Board title="🧡 Orange Cap" items={lb.orangeCap} valueLabel="Total runs" value={(p) => `${p.runs}`} />
          <Board title="⚡ Super Striker" items={lb.superStriker} valueLabel="Strike rate" value={(p) => p.strikeRate.toFixed(1)} />
          <Board title="👑 Average God" items={lb.averageGod} valueLabel="Batting average" value={(p) => p.average.toFixed(1)} />
          <Board title="🏏 Four Boss" items={lb.fourBoss} valueLabel="Total fours" value={(p) => `${p.fours}`} />
          <Board title="💥 Six King" items={lb.sixKing} valueLabel="Total sixes" value={(p) => `${p.sixes}`} />
        </TabsContent>
        <TabsContent value="bowl" className="space-y-3 mt-3">
          <Board title="💜 Purple Cap" items={lb.purpleCap} valueLabel="Wickets" value={(p) => `${p.wickets}`} />
          <Board title="🔥 Economical Blazer" items={lb.economicalBlazer} valueLabel="Economy" value={(p) => p.econ.toFixed(2)} />
          <Board title="🎯 Wicket Hunter" items={lb.wicketHunter} valueLabel="Bowling SR (lower = better)" value={(p) => p.sr.toFixed(2)} />
          <Board title="🏆 Average King" items={lb.averageKing} valueLabel="Avg runs / wicket" value={(p) => p.avg.toFixed(2)} />
          <Board title="• Dot Ball Dominator" items={lb.dotDominator} valueLabel="Dot balls" value={(p) => `${p.dotBalls}`} />
        </TabsContent>
        <TabsContent value="field" className="space-y-3 mt-3">
          <Board title="🧤 Catch Expert" items={lb.catchExpert} valueLabel="Catches" value={(p) => `${p.catches}`} />
          <Board title="🎯 GunShot Throw" items={lb.gunshotThrow} valueLabel="Run outs" value={(p) => `${p.runouts}`} />
          <Board title="🔥 Fiery Hands" items={lb.fieryHands} valueLabel="Stumpings" value={(p) => `${p.stumpings}`} />
        </TabsContent>
        <TabsContent value="team" className="space-y-3 mt-3">
          <Board title="🏆 Most Wins" items={lb.mostWins} valueLabel="Wins" value={(p) => `${p.wins}`} />
          <Board title="📋 Most Matches" items={lb.mostMatches} valueLabel="Matches" value={(p) => `${p.matches}`} />
          <Board title="⚖️ Best W/L Ratio" items={lb.bestWL} valueLabel="Win/Loss ratio" value={(p) => p.ratio.toFixed(2)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
