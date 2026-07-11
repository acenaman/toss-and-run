import { useState } from "react";
import { Plus, Trash2, Camera, X, Pencil } from "lucide-react";
import { useApp, makeSavedTeam, makePlayer } from "@/lib/store";
import type { Player, SavedTeam } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export function TeamsScreen() {
  const teams = useApp((s) => s.teams);
  const upsertTeam = useApp((s) => s.upsertTeam);
  const deleteTeam = useApp((s) => s.deleteTeam);
  const [editing, setEditing] = useState<SavedTeam | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-3 pb-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">Teams</h2>
        <Button onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1" /> New Team</Button>
      </div>
      {teams.length === 0 && (
        <Card className="p-6 text-center text-muted-foreground">
          No teams yet. Tap <b>New Team</b> to add one.
        </Card>
      )}
      {teams.map((t) => (
        <Card key={t.id} className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-lg font-semibold">{t.name}</div>
              <div className="text-xs text-muted-foreground">{t.players.length} player{t.players.length === 1 ? "" : "s"}</div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" aria-label="Edit team" onClick={() => setEditing(t)}><Pencil className="w-4 h-4" /></Button>
              <Button size="sm" variant="destructive" aria-label="Delete team" onClick={() => { if (confirm(`Delete ${t.name}?`)) { deleteTeam(t.id); toast.success("Team deleted"); } }}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {t.players.map((p) => (
              <span key={p.id} className="text-xs bg-secondary rounded-full px-2.5 py-1 flex items-center gap-1">
                {p.photo && <img src={p.photo} alt="" className="w-4 h-4 rounded-full object-cover" />}
                {p.name}
              </span>
            ))}
          </div>
        </Card>
      ))}

      {creating && (
        <TeamEditor
          team={null}
          onClose={() => setCreating(false)}
          onSave={(name, players) => { upsertTeam(makeSavedTeam(name, players)); setCreating(false); toast.success("Team created"); }}
        />
      )}
      {editing && (
        <TeamEditor
          team={editing}
          onClose={() => setEditing(null)}
          onSave={(name, players) => { upsertTeam({ ...editing, name, players }); setEditing(null); toast.success("Team saved"); }}
        />
      )}
    </div>
  );
}

export function TeamEditor({
  team, onClose, onSave,
}: { team: SavedTeam | null; onClose: () => void; onSave: (name: string, players: Player[]) => void; }) {
  const [name, setName] = useState(team?.name ?? "");
  const [players, setPlayers] = useState<Player[]>(team?.players ?? []);
  const [newPlayer, setNewPlayer] = useState("");

  const addPlayer = () => {
    const trimmed = newPlayer.trim();
    if (!trimmed) return;
    setPlayers((ps) => [...ps, makePlayer(trimmed)]);
    setNewPlayer("");
  };
  const removePlayer = (id: string) => setPlayers((ps) => ps.filter((p) => p.id !== id));
  const onPhoto = (id: string, file: File) => {
    const r = new FileReader();
    r.onload = () => setPlayers((ps) => ps.map((p) => p.id === id ? { ...p, photo: r.result as string } : p));
    r.readAsDataURL(file);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{team ? "Edit Team" : "New Team"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Team name" />
          <div className="flex gap-2">
            <Input value={newPlayer} onChange={(e) => setNewPlayer(e.target.value)} placeholder="Player name" onKeyDown={(e) => e.key === "Enter" && addPlayer()} />
            <Button onClick={addPlayer} aria-label="Add player"><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {players.map((p) => (
              <div key={p.id} className="flex items-center gap-2 bg-secondary rounded-md p-2">
                {p.photo ? (
                  <img src={p.photo} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs">{p.name.slice(0, 2).toUpperCase()}</div>
                )}
                <div className="flex-1">{p.name}</div>
                <label className="cursor-pointer text-muted-foreground hover:text-foreground" aria-label="Add player photo">
                  <Camera className="w-4 h-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onPhoto(p.id, e.target.files[0])} />
                </label>
                <button onClick={() => removePlayer(p.id)} className="text-destructive" aria-label="Remove player"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { if (!name.trim()) { toast.error("Team name required"); return; } onSave(name.trim(), players); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
