import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { MessageSquarePlus, MessagesSquare, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { UserAvatar } from "@/components/brand";
import { type FriendProfile, acceptedFriendIds, openDirectChat, profilesByIds, withDemoFriends } from "@/lib/friends";
import { DEMO_FRIENDS, addDemoGroup, demoDirectChatId, demoGroups, demoLatest, demoUnread, isDemoId, isGuest } from "@/lib/demo-data";
import { unreadByGroup } from "@/lib/unread";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/chat/")({
  component: ChatListPage,
});

type Group = { id: string; name: string; is_direct: boolean; created_at: string };
type LastMsg = { group_id: string; content: string | null; attachment_url: string | null; created_at: string };

const preview = (m?: LastMsg) => (!m ? "まだメッセージはありません" : m.content || (m.attachment_url ? "📎 ファイルを送信しました" : ""));

function ChatListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [dmByFriend, setDmByFriend] = useState<Record<string, string>>({});
  const [lastMsg, setLastMsg] = useState<Record<string, LastMsg>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [friendIds, gm] = await Promise.all([
      acceptedFriendIds(user.id).then((ids) => withDemoFriends(user, ids)),
      supabase.from("group_members").select("group_id, chat_groups(id, name, is_direct, created_at)").eq("user_id", user.id),
    ]);
    const myGroups = ((gm.data ?? []) as unknown as { chat_groups: Group | null }[]).map((r) => r.chat_groups).filter(Boolean) as Group[];
    const groupIds = myGroups.map((g) => g.id);
    const directIds = myGroups.filter((g) => g.is_direct).map((g) => g.id);

    const [profs, members, msgs, counts] = await Promise.all([
      profilesByIds(friendIds),
      directIds.length
        ? supabase.from("group_members").select("group_id, user_id").in("group_id", directIds).neq("user_id", user.id)
        : Promise.resolve({ data: [] as { group_id: string; user_id: string }[] }),
      groupIds.length
        ? supabase.from("messages").select("group_id, content, attachment_url, created_at").in("group_id", groupIds).order("created_at", { ascending: false }).limit(300)
        : Promise.resolve({ data: [] as LastMsg[] }),
      unreadByGroup(user.id, groupIds),
    ]);

    const latest: Record<string, LastMsg> = {};
    for (const m of (msgs.data ?? []) as LastMsg[]) if (!latest[m.group_id]) latest[m.group_id] = m;
    const dm: Record<string, string> = {};
    for (const m of members.data ?? []) {
      // 同じ相手との個別チャットが複数あれば、最後に発言があった方を使う
      const prev = dm[m.user_id];
      if (!prev || (latest[m.group_id]?.created_at ?? "") > (latest[prev]?.created_at ?? "")) dm[m.user_id] = m.group_id;
    }

    let shown = myGroups.filter((g) => !g.is_direct);
    let unreadCounts = counts;
    // ゲストにはデモの会話も表示する
    if (isGuest(user)) {
      Object.assign(latest, demoLatest(user.id));
      for (const f of DEMO_FRIENDS) dm[f.id] = demoDirectChatId(f.id);
      shown = [...shown, ...demoGroups().filter((g) => !g.is_direct)];
      unreadCounts = { ...counts, ...demoUnread(user.id) };
    }

    setFriends(profs);
    setGroups(shown.sort((a, b) => (latest[b.id]?.created_at ?? b.created_at).localeCompare(latest[a.id]?.created_at ?? a.created_at)));
    setDmByFriend(dm);
    setLastMsg(latest);
    setUnread(unreadCounts);
  }, [user]);

  useEffect(() => {
    load();
    window.addEventListener("ut:unread-changed", load);
    return () => window.removeEventListener("ut:unread-changed", load);
  }, [load]);

  const openFriend = async (f: FriendProfile) => {
    const id = dmByFriend[f.id] ?? (await openDirectChat(user!.id, f));
    if (!id) return toast.error("チャットを開けませんでした");
    navigate({ to: "/app/chat/$id", params: { id } });
  };

  const createGroup = async () => {
    if (!name.trim()) return toast.error("グループ名を入力してください");
    if (selected.length === 0) return toast.error("メンバーを1人以上選んでください");
    // デモのフレンドを含むグループはこの端末の中だけで作る
    if (selected.some(isDemoId)) {
      const g = addDemoGroup(name.trim(), selected);
      setName("");
      setSelected([]);
      return navigate({ to: "/app/chat/$id", params: { id: g.id } });
    }
    setCreating(true);
    const { data: g, error } = await supabase.from("chat_groups").insert({ name: name.trim(), created_by: user!.id, is_direct: false }).select().single();
    if (error || !g) {
      setCreating(false);
      return toast.error(error?.message ?? "作成に失敗しました");
    }
    const { error: e2 } = await supabase.from("group_members").insert([user!.id, ...selected].map((uid) => ({ group_id: g.id, user_id: uid })));
    setCreating(false);
    if (e2) return toast.error(e2.message);
    setName("");
    setSelected([]);
    navigate({ to: "/app/chat/$id", params: { id: g.id } });
  };

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  return (
    <section className="ut-card">
      <div className="flex items-start justify-between border-b border-border pb-4">
        <div>
          <div className="ut-eyebrow">メッセージ</div>
          <h2 className="mt-1 text-3xl font-extrabold">チャット</h2>
        </div>
        <span className="ut-soft rounded-full px-4 py-2 font-bold">{totalUnread}件未読</span>
      </div>

      <h3 className="ut-eyebrow mt-5">フレンド</h3>
      {friends.length === 0 ? (
        <p className="mt-2 text-muted-foreground">フレンドを追加するとここからチャットできます。</p>
      ) : (
        <ul className="mt-2 space-y-2.5">
          {friends.map((f) => {
            const gid = dmByFriend[f.id];
            return (
              <li key={f.id}>
                <button type="button" onClick={() => openFriend(f)} className="flex w-full items-center gap-4 rounded-3xl border border-border p-3.5 text-left hover:bg-muted">
                  <UserAvatar src={f.avatar_url} name={f.full_name} className="h-14 w-14 rounded-2xl" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-lg font-extrabold">{f.full_name}</div>
                    <div className="truncate text-muted-foreground">{preview(gid ? lastMsg[gid] : undefined)}</div>
                  </div>
                  <UnreadDot n={gid ? unread[gid] : 0} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <h3 className="ut-eyebrow mt-6">グループ</h3>
      <div className="mt-2 space-y-4 rounded-3xl border border-border p-4">
        <input className="ut-input rounded-full" placeholder="グループ名" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        {friends.length === 0 ? (
          <p className="text-sm text-muted-foreground">フレンドを追加するとグループを作れます。</p>
        ) : (
          <div className="space-y-2">
            {friends.map((f) => (
              <label key={f.id} className="flex items-center gap-3 px-1 text-lg font-bold">
                <input
                  type="checkbox"
                  className="h-6 w-6 accent-[oklch(0.36_0.16_318)]"
                  checked={selected.includes(f.id)}
                  onChange={(e) => setSelected((s) => (e.target.checked ? [...s, f.id] : s.filter((x) => x !== f.id)))}
                />
                {f.full_name}
              </label>
            ))}
          </div>
        )}
        <button type="button" onClick={createGroup} disabled={creating} className="ut-soft flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-lg font-bold">
          <MessageSquarePlus className="h-6 w-6" />
          作成
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="mt-4 text-muted-foreground">グループはまだありません</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {groups.map((g) => (
            <li key={g.id}>
              <Link to="/app/chat/$id" params={{ id: g.id }} className="flex items-center gap-4 rounded-3xl border border-border p-3.5 hover:bg-muted">
                <span className="ut-soft flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl">
                  <UsersRound className="h-7 w-7" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-lg font-extrabold">{g.name}</div>
                  <div className="truncate text-muted-foreground">{preview(lastMsg[g.id])}</div>
                </div>
                <UnreadDot n={unread[g.id]} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {friends.length === 0 && groups.length === 0 && (
        <div className="mt-5 flex flex-col items-center rounded-3xl border border-border py-10 text-center">
          <span className="ut-soft flex h-16 w-16 items-center justify-center rounded-3xl">
            <MessagesSquare className="h-8 w-8" />
          </span>
          <p className="mt-3 text-lg font-bold">会話を選択してください</p>
        </div>
      )}
    </section>
  );
}

function UnreadDot({ n }: { n?: number }) {
  if (!n) return null;
  return (
    <span className={cn("flex h-7 min-w-7 items-center justify-center rounded-full bg-red-500 px-2 text-sm font-bold text-white")}>{n > 99 ? "99+" : n}</span>
  );
}
