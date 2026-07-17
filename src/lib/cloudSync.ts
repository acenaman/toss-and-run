import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { storage } from "./storage";
import type { Json } from "@/integrations/supabase/types";
import type { Match, SavedTeam } from "./types";

export type CloudUser = { id: string; email?: string };

export async function getCloudUser(): Promise<CloudUser | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? undefined };
}

export function onCloudAuthChange(cb: (user: CloudUser | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user ? { id: session.user.id, email: session.user.email ?? undefined } : null);
  });
  return () => data.subscription.unsubscribe();
}

export async function signInWithGoogle() {
  // Google OAuth must go through the Lovable broker. It handles the
  // iframe/preview popup (web_message) automatically and falls back to a
  // full-page redirect on standalone tabs.
  return lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
}

// Cross-tab: broadcast auth changes so other open tabs re-check.
export function broadcastAuthChange() {
  try {
    const bc = new BroadcastChannel("gcs-auth");
    bc.postMessage({ type: "auth-changed", at: Date.now() });
    bc.close();
  } catch { /* noop */ }
}

export function onAuthBroadcast(cb: () => void) {
  let bc: BroadcastChannel | null = null;
  try {
    bc = new BroadcastChannel("gcs-auth");
    bc.onmessage = () => cb();
  } catch { /* noop */ }
  const onStorage = (e: StorageEvent) => {
    if (e.key && e.key.startsWith("sb-") && e.key.endsWith("-auth-token")) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    if (bc) bc.close();
    window.removeEventListener("storage", onStorage);
  };
}

export async function signOutCloud() {
  await supabase.auth.signOut();
}

export async function readCloudSnapshot() {
  const { data, error } = await supabase.from("cloud_snapshots").select("teams,matches,active_match_id,client_updated_at,device_id").maybeSingle();
  if (error) throw error;
  return data;
}

export async function writeCloudSnapshot(input: { teams: SavedTeam[]; matches: Match[]; activeMatchId: string | null; clientUpdatedAt?: number }) {
  const user = await getCloudUser();
  if (!user) return;
  const clientUpdatedAt = input.clientUpdatedAt ?? (storage.getClientUpdatedAt() || Date.now());
  const { error } = await supabase.from("cloud_snapshots").upsert({
    user_id: user.id,
    teams: input.teams as unknown as Json,
    matches: input.matches as unknown as Json,
    active_match_id: input.activeMatchId,
    client_updated_at: clientUpdatedAt,
    device_id: storage.getDeviceId(),
  }, { onConflict: "user_id" });
  if (error) throw error;
}