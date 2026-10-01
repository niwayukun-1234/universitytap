import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Paperclip, SendHorizontal } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { UserAvatar } from "@/components/brand";
import { hhmm } from "@/lib/campus";
import { markRead } from "@/lib/unread";
import { DEMO_FRIENDS, addDemoMessage, demoGroup, demoMessages, demoReply, isDemoId } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/chat/$id")({
  component: ChatPage,
});

type Msg = {
  id: string;
  user_id: string;
  content: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  created_at: string;
};
type Member = { id: string; full_name: string; avatar_url: string | null };

function ChatPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [title, setTitle] = useState("チャット");
  const [isDirect, setIsDirect] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [members, setMembers] = useState<Record<string, Member>>({});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const demo = isDemoId(id);
  const idRef = useRef(id);
  idRef.current = id;

  useEffect(() => {
    // デモの会話（ゲスト用）はデータベースを使わない
    if (demo) {
      const g = demoGroup(id);
      setMsgs(user ? demoMessages(id, user.id) : []);
      setMembers(Object.fromEntries(DEMO_FRIENDS.map((f) => [f.id, f])));
      setIsDirect(!!g?.is_direct);
      setTitle(g?.name ?? "チャット");
      return;
    }
    (async () => {
      const [g, m, mem] = await Promise.all([
        supabase.from("chat_groups").select("name, is_direct").eq("id", id).maybeSingle(),
        supabase.from("messages").select("*").eq("group_id", id).order("created_at"),
        supabase.from("group_members").select("user_id").eq("group_id", id),
      ]);
      setMsgs((m.data as Msg[]) ?? []);
      const ids = (mem.data ?? []).map((x) => x.user_id);
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids)
        : { data: [] as Member[] };
      const map: Record<string, Member> = {};
      for (const p of (profs ?? []) as Member[]) map[p.id] = p;
      setMembers(map);
      setIsDirect(!!g.data?.is_direct);
      // 個別チャットは相手の名前を表示する
      const other = ids.find((u) => u !== user?.id);
      setTitle(g.data?.is_direct && other && map[other] ? map[other].full_name : (g.data?.name ?? "チャット"));
    })();
  }, [id, user?.id, demo]);

  useEffect(() => {
    if (demo) return;
    const ch = supabase
      .channel(`messages:${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `group_id=eq.${id}` }, (payload) => {
        setMsgs((prev) => (prev.some((p) => p.id === (payload.new as Msg).id) ? prev : [...prev, payload.new as Msg]));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, demo]);

  // 表示したメッセージは既読にする
  useEffect(() => {
    if (user) markRead(user.id, id);
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, user, id]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    if (demo) {
      setMsgs((prev) => [...prev, { ...addDemoMessage(id, null, body), user_id: user!.id }]);
      setText("");
      // 少し待ってから相手が返信する
      setTimeout(() => {
        const r = demoReply(id);
        if (r && idRef.current === r.group_id) setMsgs((prev) => (prev.some((p) => p.id === r.id) ? prev : [...prev, r]));
      }, 1500);
      return;
    }
    setSending(true);
    const { error } = await supabase.from("messages").insert({ group_id: id, user_id: user!.id, content: body });
    setSending(false);
    if (error) return toast.error(error.message);
    setText("");
  };

  const sendFile = async (f: File) => {
    if (demo) return toast("デモの会話ではファイルを送信できません");
    if (f.size > 10 * 1024 * 1024) return toast.error("10MBまでのファイルを送信できます");
    const path = `${id}/${Date.now()}-${f.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("chat").upload(path, f);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("chat").getPublicUrl(path);
    const { error: e2 } = await supabase
      .from("messages")
      .insert({ group_id: id, user_id: user!.id, content: "", attachment_url: data.publicUrl, attachment_type: f.type });
    if (e2) toast.error(e2.message);
  };

  return (
    <div className="flex h-[calc(100dvh-230px)] min-h-[420px] flex-col overflow-hidden rounded-[28px] bg-card/70 shadow-[0_8px_30px_-12px_oklch(0.36_0.16_318/0.18)]">
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <Link to="/app/chat" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted" aria-label="チャット一覧へ">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="truncate text-lg font-extrabold">{title}</h2>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-[oklch(0.97_0.008_290)] px-4 py-4">
        {msgs.length === 0 && <p className="py-10 text-center text-muted-foreground">まだメッセージはありません</p>}
        {msgs.map((m) => {
          const me = m.user_id === user!.id;
          const who = members[m.user_id];
          return (
            <div key={m.id} className={cn("flex items-end gap-2", me ? "justify-end" : "justify-start")}>
              {!me && <UserAvatar src={who?.avatar_url} name={who?.full_name} className="h-8 w-8" />}
              <div
                className={cn(
                  "max-w-[75%] rounded-3xl px-5 py-3 shadow-sm",
                  me ? "rounded-br-lg bg-primary text-primary-foreground" : "rounded-bl-lg bg-card",
                )}
              >
                {!me && !isDirect && <div className="mb-0.5 text-xs font-bold text-primary">{who?.full_name}</div>}
                {m.content && <div className="whitespace-pre-wrap break-words text-lg font-bold">{m.content}</div>}
                {m.attachment_url &&
                  (m.attachment_type?.startsWith("image/") ? (
                    <img src={m.attachment_url} alt="" className="mt-1 max-h-64 rounded-2xl" />
                  ) : (
                    <a href={m.attachment_url} target="_blank" rel="noreferrer" className="underline">
                      📎 ファイルを開く
                    </a>
                  ))}
                <div className={cn("mt-1 text-right text-sm", me ? "text-primary-foreground/70" : "text-muted-foreground")}>{hhmm(m.created_at)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-border bg-card px-3 py-3">
        <input ref={fileRef} type="file" hidden onChange={(e) => e.target.files?.[0] && sendFile(e.target.files[0])} />
        <button type="button" onClick={() => fileRef.current?.click()} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted" aria-label="ファイルを添付">
          <Paperclip className="h-5 w-5" />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && send()}
          placeholder="メッセージを入力"
          className="min-w-0 flex-1 rounded-full border-2 border-primary/80 bg-card px-5 py-3.5 text-lg outline-none ring-primary/15 focus:ring-4"
        />
        <button type="button" onClick={send} disabled={sending} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg" aria-label="送信">
          <SendHorizontal className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
