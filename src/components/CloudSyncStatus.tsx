import { useCallback, useEffect, useState } from "react";
import { Cloud, CloudOff, LogIn, LogOut, Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getCloudUser,
  onCloudAuthChange,
  readCloudSnapshot,
  signInWithGoogle,
  signOutCloud,
  writeCloudSnapshot,
  type CloudUser,
} from "@/lib/cloudSync";
import { storage } from "@/lib/storage";
import { useApp } from "@/lib/store";
import type { Match, SavedTeam } from "@/lib/types";

export function CloudSyncStatus() {
  const [user, setUser] = useState<CloudUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const teams = useApp((s) => s.teams);
  const matches = useApp((s) => s.matches);
  const activeMatchId = useApp((s) => s.activeMatchId);
  const syncStatus = useApp((s) => s.syncStatus);
  const syncMessage = useApp((s) => s.syncMessage);
  const replaceLocalData = useApp((s) => s.replaceLocalData);
  const markSynced = useApp((s) => s.markSynced);

  const syncNow = useCallback(
    async (reason: "manual" | "auto" = "auto") => {
      const currentUser = await getCloudUser();
      setUser(currentUser);
      if (!currentUser) {
        markSynced("guest", null);
        return;
      }
      if (!navigator.onLine) {
        markSynced("offline", "Offline — will sync when internet returns");
        return;
      }
      setBusy(true);
      markSynced("syncing", "Syncing…");
      try {
        const remote = await readCloudSnapshot();
        const localUpdatedAt = storage.getClientUpdatedAt();
        if (remote && remote.client_updated_at > localUpdatedAt) {
          const merged = mergeSnapshots({
            localTeams: useApp.getState().teams,
            localMatches: useApp.getState().matches,
            localActive: useApp.getState().activeMatchId,
            remoteTeams: remote.teams as unknown as SavedTeam[],
            remoteMatches: remote.matches as unknown as Match[],
            remoteActive: remote.active_match_id,
          });
          replaceLocalData({ ...merged, clientUpdatedAt: Date.now() });
          await writeCloudSnapshot({ ...merged, clientUpdatedAt: storage.getClientUpdatedAt() });
          markSynced("idle", "Cloud data loaded");
          if (reason === "manual") toast.success("Cloud data loaded");
        } else {
          const latest = useApp.getState();
          await writeCloudSnapshot({
            teams: latest.teams,
            matches: latest.matches,
            activeMatchId: latest.activeMatchId,
          });
          markSynced("idle", "Synced");
          if (reason === "manual") toast.success("Synced to cloud");
        }
      } catch (error) {
        markSynced("error", error instanceof Error ? error.message : "Sync failed");
        if (reason === "manual") toast.error("Cloud sync failed");
      } finally {
        setBusy(false);
      }
    },
    [markSynced, replaceLocalData],
  );

  useEffect(() => {
    getCloudUser().then((u) => {
      setUser(u);
      markSynced(u ? "idle" : "guest", null);
      if (u) void syncNow();
    });
    return onCloudAuthChange((u) => {
      setUser(u);
      markSynced(u ? "idle" : "guest", null);
      if (u) void syncNow();
    });
  }, [markSynced, syncNow]);

  useEffect(() => {
    if (!user) return;
    const timer = window.setTimeout(() => {
      void syncNow();
    }, 900);
    return () => window.clearTimeout(timer);
  }, [teams, matches, activeMatchId, user, syncNow]);

  useEffect(() => {
    const onOnline = () => {
      if (user) void syncNow();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [syncNow, user]);

  if (!user) {
    return (
      <button
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] text-secondary-foreground"
        onClick={() => void signInWithGoogle()}
      >
        <LogIn className="h-3 w-3" /> Google Sync
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        title={syncMessage ?? (user.email ? `Logged in: ${user.email}` : "Logged in")}
        className="inline-flex w-[150px] items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] text-secondary-foreground"
        onClick={() => void syncNow("manual")}
        disabled={busy}
      >
        {syncStatus === "offline" || syncStatus === "error" ? (
          <CloudOff className="h-3 w-3 shrink-0" />
        ) : (
          <Cloud className="h-3 w-3 shrink-0" />
        )}
        <span className="flex-1 truncate text-left">
          {busy || syncStatus === "syncing"
            ? "Syncing…"
            : syncStatus === "offline"
              ? "Offline"
              : user.email
                ? user.email.split("@")[0]
                : "Logged in"}
        </span>
      </button>
      <button
        aria-label="Settings"
        className="rounded-full border border-border bg-secondary p-1 text-secondary-foreground"
        onClick={() => setSettingsOpen(true)}
      >
        <Settings className="h-3 w-3" />
      </button>
      {settingsOpen && (
        <Dialog open onOpenChange={setSettingsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="rounded-md border border-border bg-secondary p-3">
                <div className="text-xs text-muted-foreground">Signed in as</div>
                <div className="font-semibold">{user.email ?? "Google account"}</div>
              </div>
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => void syncNow("manual")}
                disabled={busy}
              >
                Sync now
              </Button>
              <Button
                className="w-full"
                variant="destructive"
                onClick={() => {
                  void signOutCloud();
                  setSettingsOpen(false);
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function mergeSnapshots(input: {
  localTeams: SavedTeam[];
  localMatches: Match[];
  localActive: string | null;
  remoteTeams: SavedTeam[];
  remoteMatches: Match[];
  remoteActive: string | null;
}) {
  const teams = mergeById(input.localTeams, input.remoteTeams);
  const matches = mergeById(input.localMatches, input.remoteMatches);
  const activeMatchId =
    input.localActive &&
    matches.some((m) => m.id === input.localActive && m.status === "in_progress")
      ? input.localActive
      : input.remoteActive;
  return { teams, matches, activeMatchId };
}

function mergeById<T extends { id: string; updatedAt?: number }>(local: T[], remote: T[]) {
  const map = new Map<string, T>();
  [...remote, ...local].forEach((item) => {
    const old = map.get(item.id);
    if (!old || (item.updatedAt ?? 0) >= (old.updatedAt ?? 0)) map.set(item.id, item);
  });
  return [...map.values()];
}
