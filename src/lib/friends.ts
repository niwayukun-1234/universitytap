import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_FRIENDS, demoCheckins, demoDirectChatId, isDemoId, isGuest } from "@/lib/demo-data";

export type FriendProfile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  faculty: string | null;
  department: string | null;
  university_id: string | null;
};

export type ActiveCheckin = {
  user_id: string;
  memo: string | null;
  created_at: string;
  classrooms: { name: string; buildings: { name: string; campus: string } | null } | null;
};

export const UNIVERSITY_NAMES: Record<string, string> = {
  doshisha: "同志社大学",
  kyoto: "京都大学",
};

export async function acceptedFriendIds(userId: string): Promise<string[]> {
  const { data } = await supabase.from("friends").select("friend_id").eq("user_id", userId).eq("status", "accepted");
  return (data ?? []).map((f) => f.friend_id);
}

/** ゲストにはデモのフレンドも加える */
export function withDemoFriends(user: User | null, ids: string[]): string[] {
  return isGuest(user) ? [...ids, ...DEMO_FRIENDS.map((f) => f.id)] : ids;
}

export async function profilesByIds(ids: string[]): Promise<FriendProfile[]> {
  const demo = DEMO_FRIENDS.filter((f) => ids.includes(f.id));
  const real = ids.filter((id) => !isDemoId(id));
  if (real.length === 0) return demo;
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, faculty, department, university_id")
    .in("id", real);
  return [...((data as FriendProfile[]) ?? []), ...demo];
}

export async function activeCheckins(ids: string[]): Promise<ActiveCheckin[]> {
  const demo = demoCheckins(ids);
  const real = ids.filter((id) => !isDemoId(id));
  if (real.length === 0) return demo;
  const { data } = await supabase
    .from("checkins")
    .select("user_id, memo, created_at, classrooms(name, buildings(name, campus))")
    .in("user_id", real)
    .eq("is_active", true);
  return [...((data as unknown as ActiveCheckin[]) ?? []), ...demo];
}

/** 2人の個別チャットを探し、無ければ作る */
export async function openDirectChat(me: string, friend: { id: string; full_name: string }): Promise<string | null> {
  if (isDemoId(friend.id)) return demoDirectChatId(friend.id);
  const { data: mine } = await supabase.from("group_members").select("group_id").eq("user_id", me);
  const myIds = (mine ?? []).map((g) => g.group_id);
  if (myIds.length) {
    const { data: shared } = await supabase
      .from("group_members")
      .select("group_id, chat_groups!inner(is_direct)")
      .eq("user_id", friend.id)
      .in("group_id", myIds)
      .eq("chat_groups.is_direct", true)
      .limit(1);
    if (shared?.[0]) return shared[0].group_id;
  }
  const { data: g, error } = await supabase
    .from("chat_groups")
    .insert({ name: friend.full_name || "DM", created_by: me, is_direct: true })
    .select()
    .single();
  if (error || !g) return null;
  await supabase.from("group_members").insert([
    { group_id: g.id, user_id: me },
    { group_id: g.id, user_id: friend.id },
  ]);
  return g.id;
}
