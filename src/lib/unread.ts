import { supabase } from "@/integrations/supabase/client";

// 既読位置は端末ごとに localStorage で管理する
const key = (userId: string, groupId: string) => `ut:lastRead:${userId}:${groupId}`;

export function getLastRead(userId: string, groupId: string): string | null {
  try {
    return localStorage.getItem(key(userId, groupId));
  } catch {
    return null;
  }
}

export function markRead(userId: string, groupId: string) {
  try {
    localStorage.setItem(key(userId, groupId), new Date().toISOString());
  } catch {
    // 保存できない環境では未読数が正確でなくなるだけ
  }
  window.dispatchEvent(new Event("ut:unread-changed"));
}

export async function myGroupIds(userId: string): Promise<string[]> {
  const { data } = await supabase.from("group_members").select("group_id").eq("user_id", userId);
  return (data ?? []).map((g) => g.group_id);
}

/** グループごとの未読数（自分の発言は数えない） */
export async function unreadByGroup(userId: string, groupIds: string[]): Promise<Record<string, number>> {
  if (groupIds.length === 0) return {};
  const { data } = await supabase
    .from("messages")
    .select("group_id, created_at, user_id")
    .in("group_id", groupIds)
    .neq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(500);
  const counts: Record<string, number> = {};
  for (const m of data ?? []) {
    const last = getLastRead(userId, m.group_id);
    if (!last || m.created_at > last) counts[m.group_id] = (counts[m.group_id] ?? 0) + 1;
  }
  return counts;
}
