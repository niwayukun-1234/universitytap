import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TimetableView } from "@/components/timetable-view";
import { ArrowLeft, MessageCircle, History, Settings } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/friend/$id")({
  component: FriendDetail,
});

type HistoryItem = { id: string; created_at: string; left_at: string | null; memo: string | null; classrooms: { name: string } | null };

function FriendDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [checkin, setCheckin] = useState<any>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [shareLoc, setShareLoc] = useState(true);
  const [shareHist, setShareHist] = useState(true);

  useEffect(() => {
    (async () => {
      const [p, c, h, fr] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
        supabase.from("checkins").select("memo, classrooms(name)").eq("user_id", id).eq("is_active", true).maybeSingle(),
        supabase.from("checkins").select("id, created_at, left_at, memo, classrooms(name)").eq("user_id", id).eq("is_active", false).order("created_at", { ascending: false }).limit(20),
        supabase.from("friends").select("share_location, share_history").eq("user_id", user!.id).eq("friend_id", id).maybeSingle(),
      ]);
      setProfile(p.data);
      setCheckin(c.data);
      setHistory((h.data as any) || []);
      if (fr.data) { setShareLoc(fr.data.share_location); setShareHist(fr.data.share_history); }
    })();
  }, [id, user]);

  const updateShare = async (field: "share_location" | "share_history", value: boolean) => {
    const update = field === "share_location" ? { share_location: value } : { share_history: value };
    const { error } = await supabase.from("friends").update(update).eq("user_id", user!.id).eq("friend_id", id);
    if (error) return toast.error(error.message);
    toast.success("更新しました");
  };

  const startDM = async () => {
    // Create or find a direct group between two users
    const { data: g } = await supabase.from("chat_groups").insert({ name: profile?.full_name || "DM", created_by: user!.id, is_direct: true }).select().single();
    if (!g) return toast.error("チャット作成に失敗");
    await supabase.from("group_members").insert([
      { group_id: g.id, user_id: user!.id },
      { group_id: g.id, user_id: id },
    ]);
    window.location.href = `/app/chat/${g.id}`;
  };

  if (!profile) return <p>読み込み中...</p>;

  const fmtTime = (s: string) => new Date(s).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-4">
      <Link to="/app/friends" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" />フレンド一覧
      </Link>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">{profile.full_name.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle>{profile.full_name}</CardTitle>
              <p className="text-xs text-muted-foreground">ID: {profile.public_id}</p>
              <p className="text-sm text-muted-foreground">{profile.faculty} {profile.department}</p>
              {profile.circle && <p className="text-xs text-muted-foreground">サークル: {profile.circle}</p>}
              {profile.seminar && <p className="text-xs text-muted-foreground">ゼミ: {profile.seminar}</p>}
            </div>
            <Button size="sm" onClick={startDM}><MessageCircle className="h-4 w-4 mr-1" />チャット</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-accent/40 rounded-lg">
            <div className="text-xs text-muted-foreground">現在地</div>
            <div className="text-lg font-semibold text-primary">
              {checkin?.classrooms?.name || "不明"}
            </div>
            {checkin?.memo && <div className="text-sm mt-1">📝 {checkin.memo}</div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-primary" />このフレンドへの公開設定</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="sl">入室位置を公開</Label>
            <Switch id="sl" checked={shareLoc} onCheckedChange={(v) => { setShareLoc(v); updateShare("share_location", v); }} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="sh">教室履歴を公開</Label>
            <Switch id="sh" checked={shareHist} onCheckedChange={(v) => { setShareHist(v); updateShare("share_history", v); }} />
          </div>
          <p className="text-xs text-muted-foreground">※相手側の設定によって、あなたが見られる相手の情報も決まります。</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-primary" />教室履歴</CardTitle></CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">公開された履歴はありません</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between p-2 border rounded text-sm">
                  <div>
                    <div className="font-medium">{h.classrooms?.name || "不明"}</div>
                    {h.memo && <div className="text-xs text-muted-foreground">📝 {h.memo}</div>}
                  </div>
                  <div className="text-xs text-right text-muted-foreground">
                    <div>入: {fmtTime(h.created_at)}</div>
                    {h.left_at && <div>退: {fmtTime(h.left_at)}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TimetableView userId={id} editable={false} />
    </div>
  );
}