import { useMemo, useState } from "react";
import { useApp, ballShortLabel } from "@/lib/store";
import type { DismissalType, Player, Wicket } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { oversString } from "@/lib/scorer";
import { Undo2, Star, Mic, RefreshCcw, AlertOctagon, X, FileText, LogOut } from "lucide-react";
import { ScorecardView } from "./ScorecardView";
import { toast } from "sonner";

export function ScorerScreen() {
  const match = useApp((s) => s.matches.find((m) => m.id === s.activeMatchId)!);
  const inn = match.innings[match.currentInningsIndex];
  const battingTeam = match.teams[inn.battingTeamIndex];
  const bowlingTeam = match.teams[inn.bowlingTeamIndex];

  const recordBall = useApp((s) => s.recordBall);
  const undo = useApp((s) => s.undoLastBall);
  const swap = useApp((s) => s.swapStrike);
  const retire = useApp((s) => s.retireBatsman);
  const changeKeeper = useApp((s) => s.changeWicketkeeper);
  const dismissOver = useApp((s) => s.dismissOver);
  const quitMatch = useApp((s) => s.quitMatch);

  const [wicketOpen, setWicketOpen] = useState(false);
  const [extraDialog, setExtraDialog] = useState<null | "wide" | "noball" | "bye" | "legbye">(null);
  const [keeperDialog, setKeeperDialog] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);

  const striker = playerById(match, inn.currentStrikerId);
  const nonStriker = playerById(match, inn.currentNonStrikerId);
  const bowler = playerById(match, inn.currentBowlerId);
  const strikerStat = striker ? inn.batters[striker.id] : undefined;
  const nonStrikerStat = nonStriker ? inn.batters[nonStriker.id] : undefined;
  const bowlerStat = bowler ? inn.bowlers[bowler.id] : undefined;

  const currentOverIdx = Math.floor((inn.legalBalls === 0 ? 0 : inn.legalBalls - 1) / 6);
  const currentOverBalls = useMemo(() => inn.balls.filter((b) => b.overNumber === currentOverIdx), [inn.balls, currentOverIdx]);

  const handleRun = (runs: number) => recordBall({ type: "run", runs });

  const recordWicket = (w: Wicket) => {
    // For wickets selected via "Wicket" button (off the bat). Default outBatsmanId = striker.
    recordBall({ type: "wicket", wicket: w });
    setWicketOpen(false);
  };

  // Voice
  const voice = () => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) { toast.error("Voice not supported on this device"); return; }
    const r = new SR();
    r.lang = "en-IN";
    r.onresult = (e: any) => {
      const text = e.results[0][0].transcript.toLowerCase();
      const m: Record<string, () => void> = {
        "dot": () => handleRun(0), "zero": () => handleRun(0),
        "one": () => handleRun(1), "single": () => handleRun(1),
        "two": () => handleRun(2), "double": () => handleRun(2),
        "three": () => handleRun(3),
        "four": () => handleRun(4), "boundary": () => handleRun(4),
        "six": () => handleRun(6),
        "wide": () => recordBall({ type: "wide", runs: 0 }),
        "no ball": () => recordBall({ type: "noball", runs: 0 }),
        "out": () => setWicketOpen(true), "wicket": () => setWicketOpen(true),
      };
      const key = Object.keys(m).find((k) => text.includes(k));
      if (key) m[key]();
      else toast(`Heard: "${text}"`);
    };
    r.onerror = () => toast.error("Voice error");
    r.start();
    toast("Listening…");
  };

  // Top header
  const inningsLabel = `Innings ${match.currentInningsIndex + 1} · ${battingTeam.name}`;
  const overLabel = `${oversString(inn.legalBalls)} of ${match.settings.overs} ov`;
  const target = match.currentInningsIndex === 1 ? match.innings[0].totalRuns + 1 : null;

  return (
    <div className="space-y-3 pb-4">
      {/* Header */}
      <Card className="p-3 gully-gradient">
        <div className="flex justify-between items-center text-xs uppercase tracking-wider text-muted-foreground">
          <span>{inningsLabel}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="secondary" onClick={() => setScoreOpen(true)}><FileText className="w-3 h-3 mr-1" />Scorecard</Button>
            <Button size="sm" variant="destructive" onClick={() => { if (confirm("Quit match? Saved as 'quitted'.")) { quitMatch(); toast("Match quit"); } }}><LogOut className="w-3 h-3" /></Button>
          </div>
        </div>
        <div className="flex items-end justify-between mt-1">
          <div className="text-4xl font-display tracking-wider">
            {inn.totalRuns}<span className="text-2xl text-muted-foreground">/{inn.totalWickets}</span>
          </div>
          <div className="text-right">
            <div className="text-sm font-mono">{overLabel}</div>
            {target !== null && <div className="text-xs text-warning">Need {Math.max(0, target - inn.totalRuns)} from {match.settings.overs * 6 - inn.legalBalls} balls</div>}
            {inn.freeHitNext && <div className="text-xs text-accent font-bold mt-1">FREE HIT</div>}
          </div>
        </div>
        <div className="mt-3 space-y-1 text-sm">
          {striker && (
            <BatterRow on player={striker} stat={strikerStat!} />
          )}
          {nonStriker && (
            <BatterRow player={nonStriker} stat={nonStrikerStat!} />
          )}
          {bowler && bowlerStat && (
            <div className="flex justify-between mt-1.5 pt-1.5 border-t border-border/40 text-xs">
              <span>🎯 {bowler.name}</span>
              <span className="font-mono">{oversString(bowlerStat.ballsBowled)}–{bowlerStat.wickets}–{bowlerStat.runsConceded}</span>
            </div>
          )}
        </div>
        <div className="mt-2 flex gap-1 flex-wrap">
          {currentOverBalls.map((b) => (
            <span key={b.id} className={`text-[10px] font-mono px-2 py-0.5 rounded ${b.wicket ? "bg-destructive text-destructive-foreground" : b.extraType ? "bg-warning text-warning-foreground" : b.runs === 4 ? "bg-accent text-accent-foreground" : b.runs === 6 ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
              {ballShortLabel(b)}
            </span>
          ))}
        </div>
      </Card>

      {/* Commentary */}
      {inn.balls.length > 0 && (
        <Card className="p-2 text-center text-sm">{inn.balls[inn.balls.length - 1].commentary}</Card>
      )}

      {/* Action toolbar */}
      <div className="flex gap-1.5 flex-wrap">
        <ToolBtn onClick={undo}><Undo2 className="w-3 h-3 mr-1" />Undo</ToolBtn>
        <ToolBtn onClick={swap}><RefreshCcw className="w-3 h-3 mr-1" />Swap</ToolBtn>
        <ToolBtn onClick={retire}><Star className="w-3 h-3 mr-1" />Retire</ToolBtn>
        <ToolBtn onClick={() => setKeeperDialog(true)}>🧤 WK</ToolBtn>
        <ToolBtn onClick={() => { if (confirm("Dismiss this over? Choose whether to keep runs/wickets recorded.")) {
          const keep = confirm("Keep runs & wickets from this over? OK = keep, Cancel = discard.");
          dismissOver(keep);
        }}}><AlertOctagon className="w-3 h-3 mr-1" />DM</ToolBtn>
        <ToolBtn onClick={voice}><Mic className="w-3 h-3 mr-1" />Voice</ToolBtn>
      </div>

      {/* Scoring grid */}
      <div className="grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((n) => (
          <Button key={n} size="lg" variant="secondary" className="scorer-btn h-14 text-lg" onClick={() => handleRun(n)}>{n}</Button>
        ))}
        <Button size="lg" className="scorer-btn h-14 text-lg bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => handleRun(4)}>4</Button>
        <Button size="lg" className="scorer-btn h-14 text-lg bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => handleRun(6)}>6</Button>
        <Button size="lg" variant="secondary" className="scorer-btn h-14" onClick={() => setExtraDialog("wide")}>Wd</Button>
        <Button size="lg" variant="secondary" className="scorer-btn h-14" onClick={() => setExtraDialog("noball")}>Nb</Button>
        <Button size="lg" variant="secondary" className="scorer-btn h-14" onClick={() => recordBall({ type: "penalty", runs: 5 })}>Pen+5</Button>
        <Button size="lg" variant="secondary" className="scorer-btn h-14" onClick={() => setExtraDialog("legbye")}>LB</Button>
        <Button size="lg" variant="secondary" className="scorer-btn h-14" onClick={() => setExtraDialog("bye")}>B</Button>
        <Button size="lg" className="scorer-btn h-14 col-span-1 bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => setWicketOpen(true)}>OUT</Button>
      </div>

      {/* Dialogs */}
      {wicketOpen && (
        <WicketDialog
          mode="bat"
          rules={match.rules}
          batters={[striker, nonStriker].filter(Boolean) as Player[]}
          fielders={bowlingTeam.players}
          onClose={() => setWicketOpen(false)}
          onPick={recordWicket}
        />
      )}
      {extraDialog && (
        <ExtraDialog
          type={extraDialog}
          rules={match.rules}
          batters={[striker, nonStriker].filter(Boolean) as Player[]}
          fielders={bowlingTeam.players}
          wicketkeeperId={inn.wicketkeeperId}
          onClose={() => setExtraDialog(null)}
          onConfirm={(runs, wicket) => {
            recordBall({ type: extraDialog as any, runs, wicket });
            setExtraDialog(null);
          }}
        />
      )}
      {keeperDialog && (
        <Dialog open onOpenChange={() => setKeeperDialog(false)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Change Wicketkeeper</DialogTitle></DialogHeader>
            <div className="space-y-1">
              {bowlingTeam.players.map((p) => (
                <Button key={p.id} variant="secondary" className="w-full justify-start" onClick={() => { changeKeeper(p.id); setKeeperDialog(false); toast.success(`${p.name} is keeper`); }}>{p.name}</Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bowler / batsman prompts */}
      <NextBowlerPrompt />
      <NewBatsmanPrompt />

      {scoreOpen && (
        <Dialog open onOpenChange={() => setScoreOpen(false)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <ScorecardView match={match} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function BatterRow({ player, stat, on }: { player: Player; stat: { runs: number; balls: number; fours: number; sixes: number }; on?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="flex items-center gap-1">{on && <span className="text-primary">★</span>}{player.name}</span>
      <span className="font-mono text-xs">{stat?.runs ?? 0}({stat?.balls ?? 0})</span>
    </div>
  );
}

function ToolBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <Button size="sm" variant="secondary" className="h-8 px-2 text-xs" onClick={onClick}>{children}</Button>;
}

function playerById(match: any, id?: string): Player | undefined {
  if (!id) return undefined;
  if (id === "__rk__" && match.rules.relluKattaName) return { id: "__rk__", name: `🪅 ${match.rules.relluKattaName}` };
  for (const t of match.teams) {
    const p = t.players.find((x: Player) => x.id === id);
    if (p) return p;
  }
  return undefined;
}

function NextBowlerPrompt() {
  const match = useApp((s) => s.matches.find((m) => m.id === s.activeMatchId)!);
  const setNextBowler = useApp((s) => s.setNextBowler);
  const inn = match.innings[match.currentInningsIndex];
  const needs = !inn.done && inn.balls.length > 0 && !inn.currentBowlerId;
  const [picked, setPicked] = useState<string>("");
  const [mini, setMini] = useState(false);
  if (!needs) return null;
  const bowlingTeam = match.teams[inn.bowlingTeamIndex];
  const eligible = bowlingTeam.players.filter((p) => {
    if (p.id === inn.previousBowlerId) return false;
    if (match.rules.overLimit !== null && (inn.bowlerOverCount[p.id] ?? 0) >= match.rules.overLimit) return false;
    return true;
  });
  return (
    <Dialog open>
      <DialogContent>
        <DialogHeader><DialogTitle>Next Bowler</DialogTitle></DialogHeader>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {eligible.map((p) => (
            <Button key={p.id} variant={picked === p.id ? "default" : "secondary"} className="w-full justify-start" onClick={() => setPicked(p.id)}>{p.name} ({inn.bowlerOverCount[p.id] ?? 0} ov)</Button>
          ))}
        </div>
        {match.rules.miniCheck && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={mini} onChange={(e) => setMini(e.target.checked)} />
            Mini-Check (bowl 3 balls then optionally swap)
          </label>
        )}
        <DialogFooter>
          <Button disabled={!picked} onClick={() => setNextBowler(picked, mini)}>Start Over</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewBatsmanPrompt() {
  const match = useApp((s) => s.matches.find((m) => m.id === s.activeMatchId)!);
  const select = useApp((s) => s.selectNewBatsman);
  const inn = match.innings[match.currentInningsIndex];
  if (inn.done) return null;
  const needs = !inn.currentStrikerId || (match.rules.nonStriker && !inn.currentNonStrikerId);
  if (!needs) return null;
  // Only after at least one ball (so initial openers aren't double-asked)
  if (inn.balls.length === 0) return null;
  const battingTeam = match.teams[inn.battingTeamIndex];
  const usedIds = new Set([
    ...Object.keys(inn.batters).filter((id) => inn.batters[id].out || (!match.rules.retiredCanReturn && inn.batters[id].retired)),
    inn.currentStrikerId, inn.currentNonStrikerId,
  ].filter(Boolean) as string[]);
  const remaining = battingTeam.players.filter((p) => !usedIds.has(p.id));
  // include retired-can-return retired players
  if (match.rules.retiredCanReturn) {
    Object.values(inn.batters).filter((b) => b.retired).forEach((b) => {
      const p = battingTeam.players.find((x) => x.id === b.playerId);
      if (p && !remaining.find((x) => x.id === p.id) && !usedIds.has(p.id)) remaining.push(p);
    });
  }
  if (remaining.length === 0) return null;
  return (
    <Dialog open>
      <DialogContent>
        <DialogHeader><DialogTitle>New Batsman</DialogTitle></DialogHeader>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {remaining.map((p) => (
            <Button key={p.id} variant="secondary" className="w-full justify-start" onClick={() => select(p.id)}>{p.name}</Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const ALL_DISMISSALS: DismissalType[] = [
  "Bowled", "Caught", "Caught And Bowled", "LBW",
  "Run Out", "Stumped", "Hit Wicket",
  "Obstructing the Field", "Hit the Ball Twice", "Timed Out",
];

function WicketDialog({ mode: _mode, batters, fielders, onPick, onClose, rules }: { mode: "bat"; rules: any; batters: Player[]; fielders: Player[]; onPick: (w: Wicket) => void; onClose: () => void }) {
  const [type, setType] = useState<DismissalType | null>(null);
  const [fielderId, setFielderId] = useState<string | undefined>(undefined);
  const [outBatsmanId, setOutBatsmanId] = useState<string>(batters[0]?.id ?? "");
  const [oneHandOneBounce, setOhob] = useState(false);

  const needFielder = type === "Caught" || type === "Run Out";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Wicket</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-1.5">
          {ALL_DISMISSALS.map((d) => (
            <Button key={d} size="sm" variant={type === d ? "default" : "secondary"} onClick={() => setType(d)}>{d}</Button>
          ))}
        </div>
        {type === "Run Out" && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Batsman out</div>
            <select value={outBatsmanId} onChange={(e) => setOutBatsmanId(e.target.value)} className="w-full bg-input rounded-md px-2 py-2 text-sm">
              {batters.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}
        {needFielder && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">{type === "Caught" ? "Catcher" : "Fielder"}</div>
            <select value={fielderId ?? ""} onChange={(e) => setFielderId(e.target.value || undefined)} className="w-full bg-input rounded-md px-2 py-2 text-sm">
              <option value="">— skip —</option>
              {fielders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        )}
        {type === "Caught" && rules.oneHandOneBounce && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={oneHandOneBounce} onChange={(e) => setOhob(e.target.checked)} /> One hand, one bounce
          </label>
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={!type} onClick={() => {
            if (!type) return;
            const w: Wicket = { type, outBatsmanId: outBatsmanId || batters[0].id, fielderId, oneHandOneBounce: oneHandOneBounce || undefined };
            onPick(w);
          }}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExtraDialog({ type, batters, fielders, onConfirm, onClose, rules }: { type: "wide" | "noball" | "bye" | "legbye"; rules: any; batters: Player[]; fielders: Player[]; wicketkeeperId?: string; onConfirm: (runs: number, wicket?: Wicket) => void; onClose: () => void }) {
  const [runs, setRuns] = useState<number | null>(null);
  const [wicket, setWicket] = useState<Wicket | undefined>(undefined);
  const [wktOpen, setWktOpen] = useState(false);

  const runOptions = type === "wide" ? [0, 1, 2, 3, 4] : type === "noball" ? [0, 1, 2, 3, 4, 6] : [1, 2, 3, 4, 6];
  const allowedWickets: DismissalType[] = type === "wide"
    ? ["Run Out", "Stumped", "Hit Wicket", "Obstructing the Field", "Hit the Ball Twice"]
    : type === "noball"
      ? ["Run Out", "Hit Wicket", "Obstructing the Field", "Hit the Ball Twice"]
      : ["Run Out"];

  const title = type === "wide" ? "Wide" : type === "noball" ? "No Ball" : type === "bye" ? "Bye" : "Leg Bye";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title} — additional runs</DialogTitle></DialogHeader>
        <div className="grid grid-cols-6 gap-1.5">
          {runOptions.map((n) => (
            <Button key={n} size="sm" variant={runs === n ? "default" : "secondary"} onClick={() => setRuns(n)}>{n}</Button>
          ))}
          {(type === "wide" || type === "noball") && (
            <Button size="sm" variant="destructive" onClick={() => setWktOpen(true)}>W</Button>
          )}
        </div>
        {wicket && <div className="text-xs text-warning">Wicket: {wicket.type}</div>}
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={runs === null} onClick={() => onConfirm(runs ?? 0, wicket)}>Confirm</Button>
        </DialogFooter>

        {wktOpen && (
          <Dialog open onOpenChange={() => setWktOpen(false)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Wicket on this {title}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-1.5">
                {allowedWickets.map((d) => (
                  <Button key={d} size="sm" variant="secondary" onClick={() => {
                    setWicket({ type: d, outBatsmanId: batters[0]?.id ?? "", fielderId: d === "Run Out" ? fielders[0]?.id : undefined });
                    setWktOpen(false);
                  }}>{d}</Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
