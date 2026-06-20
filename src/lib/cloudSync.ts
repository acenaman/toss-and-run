import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { storage } from "./storage";
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
  return lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
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
  const clientUpdatedAt = input.clientUpdatedAt ?? storage.getClientUpdatedAt() || Date.now();
  const { error } = await supabase.from("cloud_snapshots").upsert({
    user_id: user.id,
    teams: input.teams,
    matches: input.matches,
    active_match_id: input.activeMatchId,
    client_updated_at: clientUpdatedAt,
    device_id: storage.getDeviceId(),
  }, { onConflict: "user_id" });
  if (error) throw error;
}