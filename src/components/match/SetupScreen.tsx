import { useMemo, useState } from "react";
import { Plus, Minus, X, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useApp, DEFAULT_RULES, makePlayer, makeSavedTeam } from "@/lib/store";
import type { Player, SavedTeam, TeamSquad } from "@/lib/types";
import { toast } from "sonner";

function Stepper({ value, onChange, min, max, label, allowUnlimited }: { value: number | null; onChange: (v: number | null) => void; min: number; max: number; label: string; allowUnlimited?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-1">
        {allowUnlimited && (
          <Button size="sm" variant={value === null ? "default" : "secondary"} onClick={() => onChange(value === null ? min : null)}>∞</Button>
        )}
        <Button size="icon" variant="secondary" onClick={() => onChange(Math.max(min, (value ?? min) - 1))} disabled={value === null}><Minus className="w-3 h-3" /></Button>
        <span className="font-mono w-10 text-center font-semibold">{value === null ? "∞" : value}</span>
        <Button size="icon" variant="secondary" onClick={() => onChange(Math.min(max, (value ?? min) + 1))} disabled={value === null}><Plus className="w-3 h-3" /></Button>
      </div>
    </div>
  );
}

export function SetupScreen() {
  const teams = useApp((s) => s.teams);
  const upsertTeam = useApp((s) => s.upsertTeam);
  const createMatch = useApp((s) => s.createMatch);

  const [overs, setOvers] = useState(5);
  const [players, setPlayers] = useState(8);
  const [series, setSeries] = useState(1);
  const [t1, setT1] = useState<TeamDraft>(emptyDraft());
  const [t2, setT2] = useState<TeamDraft>(emptyDraft());

  const proceed = () => {
    const v1 = validate(t1, players);
    const v2 = validate(t2, players);
    if (v1) return toast.error(`Team 1: ${v1}`);
    if (v2) return toast.error(`Team 2: ${v2}`);
    if (t1.name.trim() === t2.name.trim()) return toast.error("Team names must differ");

    // Persist any new teams or new players to saved teams
    const persist = (d: TeamDraft) => {
      if (d.sourceTeamId) {
        const saved = teams.find((t) => t.id === d.sourceTeamId);
        if (saved) {
          const known = new Set(saved.players.map((p) => p.id));
          const merged = [...saved.players, ...d.players.filter((p) => !known.has(p.id))];
          if (merged.length !== saved.players.length) upsertTeam({ ...saved, players: merged });
        }
      } else if (d.saveAsNew) {
        upsertTeam(makeSavedTeam(d.name.trim(), d.players));
      }
    };
    persist(t1); persist(t2);

    const squads: [TeamSquad, TeamSquad] = [
      { name: t1.name.trim(), players: t1.players, sourceTeamId: t1.sourceTeamId },
      { name: t2.name.trim(), players: t2.players, sourceTeamId: t2.sourceTeamId },
    ];
    createMatch({
      settings: { overs, players, series, matchIndexInSeries: 1 },
      teams: squads,
      rules: DEFAULT_RULES,
    });
    toast.success("Match created — set rules");
  };

  return (
    <div className="space-y-3 pb-4">
      <h2 className="text-2xl">New Match</h2>

      <Card className="p-4 space-y-3">
        <div className="text-sm font-semibold text-primary uppercase tracking-wider">Match Settings</div>
        <Stepper label="Overs per innings" value={overs} onChange={(v) => setOvers(v as number)} min={1} max={100} />
        <Stepper label="Players per team" value={players} onChange={(v) => setPlayers(v as number)} min={1} max={15} />
        <Stepper label="Matches in series" value={series} onChange={(v) => setSeries(v as number)} min={1} max={10} />
      </Card>

      <TeamPicker label="Team 1" expected={players} draft={t1} setDraft={setT1} otherSourceId={t2.sourceTeamId} />
      <TeamPicker label="Team 2" expected={players} draft={t2} setDraft={setT2} otherSourceId={t1.sourceTeamId} />

      <Button className="w-full h-12 text-base" onClick={proceed}>Next — Match Rules</Button>
    </div>
  );
}

type TeamDraft = {
  sourceTeamId?: string;
  name: string;
  players: Player[];
  saveAsNew: boolean;
};
const emptyDraft = (): TeamDraft => ({ name: "", players: [], saveAsNew: true });
function validate(d: TeamDraft, expected: number): string | null {
  if (!d.name.trim()) return "team name required";
  if (d.players.length !== expected) return `need ${expected} players (have ${d.players.length})`;
  return null;
}

function TeamPicker({ label, expected, draft, setDraft, otherSourceId }: { label: string; expected: number; draft: TeamDraft; setDraft: (d: TeamDraft) => void; otherSourceId?: string }) {
  const teams = useApp((s) => s.teams);
  const available = teams.filter((t) => t.id !== otherSourceId);
  const source = useMemo(() => teams.find((t) => t.id === draft.sourceTeamId), [teams, draft.sourceTeamId]);
  const [newPlayer, setNewPlayer] = useState("");

  const selectExisting = (id: string) => {
    if (id === "__new__") {
      setDraft({ ...emptyDraft(), saveAsNew: true });
      return;
    }
    const t = teams.find((x) => x.id === id);
    if (!t) return;
    setDraft({ sourceTeamId: t.id, name: t.name, players: t.players.slice(0, expected), saveAsNew: false });
  };
  const togglePlayer = (p: Player) => {
    if (draft.players.find((x) => x.id === p.id)) {
      setDraft({ ...draft, players: draft.players.filter((x) => x.id !== p.id) });
    } else if (draft.players.length < expected) {
      setDraft({ ...draft, players: [...draft.players, p] });
    }
  };
  const addPlayer = () => {
    const n = newPlayer.trim(); if (!n) return;
    setDraft({ ...draft, players: [...draft.players, makePlayer(n)] });
    setNewPlayer("");
  };
  const removePlayer = (id: string) => setDraft({ ...draft, players: draft.players.filter((p) => p.id !== id) });
  const onPhoto = (id: string, file: File) => {
    const r = new FileReader();
    r.onload = () => setDraft({ ...draft, players: draft.players.map((p) => p.id === id ? { ...p, photo: r.result as string } : p) });
    r.readAsDataURL(file);
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="text-sm font-semibold text-primary uppercase tracking-wider">{label}</div>
      <select value={draft.sourceTeamId ?? "__new__"} onChange={(e) => selectExisting(e.target.value)} className="bg-input rounded-md px-3 py-2 w-full text-sm">
        <option value="__new__">— Create new team —</option>
        {available.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.players.length})</option>)}
      </select>
      <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Team name" />

      {source && source.players.length > expected && (
        <div className="text-xs text-muted-foreground">Tap players to select {expected}</div>
      )}
      {source && (
        <div className="flex flex-wrap gap-1.5">
          {source.players.map((p) => {
            const sel = !!draft.players.find((x) => x.id === p.id);
            return (
              <button key={p.id} onClick={() => togglePlayer(p)} className={`text-xs px-2.5 py-1 rounded-full border ${sel ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border"}`}>
                {p.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <Input value={newPlayer} onChange={(e) => setNewPlayer(e.target.value)} placeholder="Add player" onKeyDown={(e) => e.key === "Enter" && addPlayer()} />
        <Button onClick={addPlayer}><Plus className="w-4 h-4" /></Button>
      </div>

      <div className="space-y-1.5">
        {draft.players.map((p, i) => (
          <div key={p.id} className="flex items-center gap-2 bg-secondary rounded-md px-2 py-1.5 text-sm">
            <span className="text-muted-foreground w-5">{i + 1}.</span>
            {p.photo ? (
              <img src={p.photo} alt="" className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px]">{p.name.slice(0, 2).toUpperCase()}</div>
            )}
            <span className="flex-1">{p.name}</span>
            <label className="cursor-pointer text-muted-foreground">
              <Camera className="w-3.5 h-3.5" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onPhoto(p.id, e.target.files[0])} />
            </label>
            <button onClick={() => removePlayer(p.id)} className="text-destructive"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
      <div className="text-xs text-muted-foreground">{draft.players.length}/{expected} players</div>
    </Card>
  );
}
