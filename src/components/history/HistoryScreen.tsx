import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Play, FileText } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { MatchSummaryView } from "@/components/match/SummaryScreen";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";

export function HistoryScreen() {
  const matches = useApp((s) => s.matches);
  const deleteMatch = useApp((s) => s.deleteMatch);
  const resumeMatch = useApp((s) => s.resumeMatch);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "completed" | "quit">("all");
  const [view, setView] = useState<string | null>(null);
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");

  const allTeams = useMemo(() => {
    const s = new Set<string>();
    matches.forEach((m) => m.teams.forEach((t) => s.add(t.name)));
    return [...s].sort();
  }, [matches]);

  const list = useMemo(() => {
    return matches
      .filter((m) => filter === "all" ? m.status !== "in_progress" : m.status === filter)
      .filter((m) => {
        if (!team1) return true;
        const names = m.teams.map((t) => t.name);
        if (!names.includes(team1)) return false;
        if (team2 && !names.includes(team2)) return false;
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [matches, filter, team1, team2]);

  return (
    <div className="space-y-3 pb-4">
      <h2 className="text-2xl">History</h2>
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="quit">Quitted</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="grid grid-cols-2 gap-2">
        <select value={team1} onChange={(e) => setTeam1(e.target.value)} className="bg-input rounded-md px-2 py-2 text-sm">
          <option value="">Filter team 1</option>
          {allTeams.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={team2} onChange={(e) => setTeam2(e.target.value)} className="bg-input rounded-md px-2 py-2 text-sm" disabled={!team1}>
          <option value="">Filter team 2 (optional)</option>
          {allTeams.filter((t) => t !== team1).map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {list.length === 0 && (
        <Card className="p-6 text-center text-muted-foreground">No matches yet.</Card>
      )}

      {list.map((m) => {
        const t0 = m.teams[0], t1 = m.teams[1];
        const s0 = m.innings[0], s1 = m.innings[1];
        const isQuit = m.status === "quit";
        return (
          <Card key={m.id} className="p-3">
            <button className="text-left w-full" onClick={() => setView(m.id)}>
              <div className="flex justify-between items-start mb-1">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  {new Date(m.createdAt).toLocaleDateString()} · {m.settings.overs} ov
                </div>
                {isQuit && <span className="text-[10px] bg-warning text-warning-foreground px-2 py-0.5 rounded-full">QUITTED</span>}
              </div>
              <div className="flex justify-between items-center">
                <div className="font-semibold">{t0.name}</div>
                <div className="font-mono">{s0.totalRuns}/{s0.totalWickets}</div>
              </div>
              <div className="flex justify-between items-center">
                <div className="font-semibold">{t1.name}</div>
                <div className="font-mono">{s1.totalRuns}/{s1.totalWickets}</div>
              </div>
              {m.resultText && <div className="mt-2 text-sm text-primary font-semibold">{m.resultText}</div>}
            </button>
            <div className="flex gap-2 mt-3">
              {isQuit && (
                <Button size="sm" onClick={() => { resumeMatch(m.id); navigate({ to: "/match" }); toast.success("Match resumed"); }}>
                  <Play className="w-3 h-3 mr-1" /> Resume
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => setView(m.id)}><FileText className="w-3 h-3 mr-1" /> Scorecard</Button>
              <Button size="sm" variant="destructive" className="ml-auto" aria-label="Delete match" onClick={() => { if (confirm("Delete this match? Stats will be recalculated.")) { deleteMatch(m.id); toast.success("Match deleted"); } }}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </Card>
        );
      })}

      {view && (
        <Dialog open onOpenChange={() => setView(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {(() => {
              const m = matches.find((x) => x.id === view);
              if (!m) return null;
              return <MatchSummaryView match={m} embedded />;
            })()}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
