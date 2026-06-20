import { useCallback, useEffect, useState } from "react";
import { Cloud, CloudOff, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import { getCloudUser, onCloudAuthChange, readCloudSnapshot, signInWithGoogle, signOutCloud, writeCloudSnapshot, type CloudUser } from "@/lib/cloudSync";
import { storage } from "@/lib/storage";
import { useApp } from "@/lib/store";
import type { Match, SavedTeam } from "@/lib/types";

export function CloudSyncStatus() {
  const [user, setUser] = useState<CloudUser | null>(null);
  const [busy, setBusy] = useState(false);
  const teams = useApp((s) => s.teams);
  const matches = useApp((s) => s.matches);
  const activeMatchId = useApp((s) => s.activeMatchId);
  const syncStatus = useApp((s) => s.syncStatus);
  const syncMessage = useApp((s) => s.syncMessage);
  const replaceLocalData = useApp((s) => s.replaceLocalData);
  const markSynced = useApp((s) => s.markSynced);

  const syncNow = useCallback(async (reason: "manual" | "auto" = "auto") => {
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
        replaceLocalData({
          teams: remote.teams as unknown as SavedTeam[],
          matches: remote.matches as unknown as Match[],
          activeMatchId: remote.active_match_id,
          clientUpdatedAt: remote.client_updated_at,
        });
        markSynced("idle", "Cloud data loaded");
        if (reason === "manual") toast.success("Cloud data loaded");
      } else {
        const latest = useApp.getState();
        await writeCloudSnapshot({ teams: latest.teams, matches: latest.matches, activeMatchId: latest.activeMatchId });
        markSynced("idle", "Synced");
        if (reason === "manual") toast.success("Synced to cloud");
      }
    } catch (error) {
      markSynced("error", error instanceof Error ? error.message : "Sync failed");
      if (reason === "manual") toast.error("Cloud sync failed");
    } finally {
      setBusy(false);
    }
  }, [markSynced, replaceLocalData]);

  useEffect(() => {
    getCloudUser().then((u) => { setUser(u); markSynced(u ? "idle" : "guest", null); if (u) void syncNow(); });
    return onCloudAuthChange((u) => { setUser(u); markSynced(u ? "idle" : "guest", null); if (u) void syncNow(); });
  }, [markSynced, syncNow]);

  useEffect(() => {
    if (!user) return;
    const timer = window.setTimeout(() => { void syncNow(); }, 900);
    return () => window.clearTimeout(timer);
  }, [teams, matches, activeMatchId, user, syncNow]);

  useEffect(() => {
    const onOnline = () => { if (user) void syncNow(); };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [syncNow, user]);

  if (!user) {
    return (
      <button className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] text-secondary-foreground" onClick={() => void signInWithGoogle()}>
        <LogIn className="h-3 w-3" /> Google Sync
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <button title={syncMessage ?? undefined} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] text-secondary-foreground" onClick={() => void syncNow("manual")} disabled={busy}>
        {syncStatus === "offline" || syncStatus === "error" ? <CloudOff className="h-3 w-3" /> : <Cloud className="h-3 w-3" />}
        {busy ? "Syncing" : syncStatus === "offline" ? "Offline" : "Synced"}
      </button>
      <button aria-label="Sign out" className="rounded-full border border-border bg-secondary p-1 text-secondary-foreground" onClick={() => void signOutCloud()}>
        <LogOut className="h-3 w-3" />
      </button>
    </div>
  );
}