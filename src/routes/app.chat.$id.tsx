import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Paperclip } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/chat/$id")({
  component: ChatPage,
});

type Msg = {
  id: string; user_id: string; content: string;
  attachment_url: string | null; attachment_type: string | null;
  created_at: string;
};

function ChatPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [group, setGroup] = useState<{ name: string } | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { full_name: string; avatar_url: string | null }>>({});
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const [g, m, mem] = await Promise.all([
      supabase.from("chat_groups").select("name").eq("id", id).maybeSingle(),
      supabase.from("messages").select("*").eq("group_id", id).order("created_at"),
      supabase.from("group_members").select("user_id").eq("group_id", id),
    ]);
    setGroup(g.data);
    setMsgs((m.data as Msg[]) || []);
    const ids = (mem.data || []).map((x) => x.user_id);
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids);
      const map: Record<string, any> = {};
      (profs || []).forEach((p: any) => (map[p.id] = p));
      setProfiles(map);
    }
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    const ch = supabase.channel(`messages:${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `group_id=eq.${id}` }, (payload) => {
        setMsgs((prev) => [...prev, payload.new as Msg]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const send = async () => {
    if (!text.trim()) return;
    const { error } = await supabase.from("messages").insert({ group_id: id, user_id: user!.id, content: text });
    if (error) return toast.error(error.message);
    setText("");
  };

  const sendFile = async (f: File) => {
    const path = `${id}/${Date.now()}-${f.name}`;
    const { error } = await supabase.storage.from("chat").upload(path, f);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("chat").getPublicUrl(path);
    await supabase.from("messages").insert({
      group_id: id, user_id: user!.id, content: "", attachment_url: data.publicUrl, attachment_type: f.type,
    });
  };

  return (
    <Card className="h-[calc(100vh-180px)] flex flex-col">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Link to="/app/friends"><ArrowLeft className="h-4 w-4" /></Link>
          {group?.name || "チャット"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col p-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
          {msgs.map((m) => {
            const me = m.user_id === user!.id;
            const p = profiles[m.user_id];
            return (
              <div key={m.id} className={`flex ${me ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-lg px-3 py-2 ${me ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {!me && <div className="text-xs font-semibold mb-1">{p?.full_name}</div>}
                  {m.content && <div className="text-sm whitespace-pre-wrap">{m.content}</div>}
                  {m.attachment_url && (
                    m.attachment_type?.startsWith("image/")
                      ? <img src={m.attachment_url} className="rounded mt-1 max-w-full" />
                      : <a href={m.attachment_url} target="_blank" className="underline text-sm">📎 ファイル</a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t p-2 flex gap-2">
          <input ref={fileRef} type="file" hidden onChange={(e) => e.target.files?.[0] && sendFile(e.target.files[0])} />
          <Button size="icon" variant="ghost" onClick={() => fileRef.current?.click()}><Paperclip className="h-4 w-4" /></Button>
          <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="メッセージを入力" />
          <Button size="icon" onClick={send}><Send className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}