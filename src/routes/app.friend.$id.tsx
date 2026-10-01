import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, History, MapPin, MessageSquare, Settings } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "@/components/brand";
import { TimetableView } from "@/components/timetable-view";
import { campusName, formatDateTime, hhmm, roomLabel } from "@/lib/campus";
import { UNIVERSITY_NAMES, openDirectChat } from "@/lib/friends";
import { DEMO_FRIENDS, demoCheckins, demoHistory, isDemoId } from "@/lib/demo-data";

export const Route = createFileRoute("/app/friend/$id")({
  component: FriendDetail,
});

type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  faculty: string | null;
  department: string | null;
  circle: string | null;
  seminar: string | null;
  university_id: string | null;
};
type RoomRef = { name: string; buildings: { name: string; campus: string } | null } | null;
type Checkin = { id: string; created_at: string; left_at: string | null; memo: string | null; classrooms: RoomRef };

const place = (r: RoomRef) => {
  if (!r) return "不明な場所";
  const b = r.buildings;
  return b ? `${campusName(b.campus)} / ${b.name} ${roomLabel(r.name, b.name)}` : r.name;
};

function FriendDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [current, setCurrent] = useState<Checkin | null>(null);
  const [history, setHistory] = useState<Checkin[]>([]);
  const [shareLoc, setShareLoc] = useState(true);
  const [shareHist, setShareHist] = useState(true);

  useEffect(() => {
    if (!user) return;
    // デモのフレンド（ゲスト用）はデータベースを使わない
    if (isDemoId(id)) {
      setProfile(DEMO_FRIENDS.find((f) => f.id === id) ?? null);
      const now = demoCheckins([id])[0];
      setCurrent(now ? { ...now, id: `${id}-now`, left_at: null } : null);
      setHistory(demoHistory(id));
      return;
    }
    const select = "id, created_at, left_at, memo, classrooms(name, buildings(name, campus))";
    (async () => {
      const [p, c, h, fr] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url, faculty, department, circle, seminar, university_id").eq("id", id).maybeSingle(),
        supabase.from("checkins").select(select).eq("user_id", id).eq("is_active", true).maybeSingle(),
        supabase.from("checkins").select(select).eq("user_id", id).eq("is_active", false).order("created_at", { ascending: false }).limit(20),
        supabase.from("friends").select("share_location, share_history").eq("user_id", user.id).eq("friend_id", id).maybeSingle(),
      ]);
      setProfile(p.data as Profile | null);
      setCurrent(c.data as unknown as Checkin | null);
      setHistory((h.data as unknown as Checkin[]) ?? []);
      if (fr.data) {
        setShareLoc(fr.data.share_location);
        setShareHist(fr.data.share_history);
      }
    })();
  }, [id, user]);

  const updateShare = async (field: "share_location" | "share_history", value: boolean) => {
    if (isDemoId(id)) return toast.success("公開設定を更新しました（デモ）");
    const patch = field === "share_location" ? { share_location: value } : { share_history: value };
    const { error } = await supabase.from("friends").update(patch).eq("user_id", user!.id).eq("friend_id", id);
    if (error) return toast.error(error.message);
    toast.success("公開設定を更新しました");
  };

  const chat = async () => {
    if (!profile) return;
    const gid = await openDirectChat(user!.id, profile);
    if (!gid) return toast.error("チャットを開けませんでした");
    navigate({ to: "/app/chat/$id", params: { id: gid } });
  };

  if (!profile) return <p className="py-10 text-center text-muted-foreground">読み込み中...</p>;

  return (
    <div className="space-y-5">
      <Link to="/app/friends" search={{ invite: undefined }} className="inline-flex items-center gap-1 font-bold text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        フレンド一覧
      </Link>

      <section className="ut-card">
        <div className="flex items-center gap-4">
          <UserAvatar src={profile.avatar_url} name={profile.full_name} className="h-20 w-20 rounded-3xl" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-2xl font-extrabold">{profile.full_name}</h2>
            <div className="text-muted-foreground">{UNIVERSITY_NAMES[profile.university_id ?? ""] ?? ""}</div>
            <div className="text-sm text-muted-foreground">{[profile.faculty, profile.department].filter(Boolean).join(" ")}</div>
          </div>
        </div>
        {(profile.circle || profile.seminar) && (
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {profile.circle && <span className="rounded-full bg-muted px-3 py-1">サークル: {profile.circle}</span>}
            {profile.seminar && <span className="rounded-full bg-muted px-3 py-1">ゼミ: {profile.seminar}</span>}
          </div>
        )}
        {current ? (
          <div className="ut-soft mt-4 flex gap-3 rounded-2xl px-4 py-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <div className="font-bold text-foreground">{place(current.classrooms)}</div>
              <div className="text-muted-foreground">入室 {hhmm(current.created_at)}</div>
              {current.memo && <div className="mt-1 text-sm text-foreground">📝 {current.memo}</div>}
            </div>
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-muted px-4 py-3 text-muted-foreground">現在は入室していません</p>
        )}
        <button type="button" onClick={chat} className="ut-btn-primary mt-4 w-full rounded-full py-3.5">
          <MessageSquare className="h-5 w-5" />
          チャット
        </button>
      </section>

      <section className="ut-card">
        <h2 className="ut-card-title">
          <Settings className="h-6 w-6 text-primary" />
          このフレンドへの公開設定
        </h2>
        <div className="mt-4 space-y-4">
          <label className="flex items-center justify-between font-bold">
            入室場所を公開
            <Switch checked={shareLoc} onCheckedChange={(v) => { setShareLoc(v); updateShare("share_location", v); }} />
          </label>
          <label className="flex items-center justify-between font-bold">
            入室履歴を公開
            <Switch checked={shareHist} onCheckedChange={(v) => { setShareHist(v); updateShare("share_history", v); }} />
          </label>
          <p className="text-xs text-muted-foreground">※あなたが見られる相手の情報は、相手側の設定で決まります。</p>
        </div>
      </section>

      <section className="ut-card">
        <h2 className="ut-card-title">
          <History className="h-6 w-6 text-primary" />
          入室履歴
        </h2>
        {history.length === 0 ? (
          <p className="mt-3 text-muted-foreground">公開された履歴はありません</p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {history.map((h) => (
              <li key={h.id} className="rounded-2xl border border-border px-4 py-3">
                <div className="font-bold">{place(h.classrooms)}</div>
                <div className="text-sm text-muted-foreground">
                  {formatDateTime(h.created_at)} 〜 {h.left_at ? hhmm(h.left_at) : ""}
                </div>
                {h.memo && <div className="mt-1 text-sm text-muted-foreground">📝 {h.memo}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <TimetableView userId={id} editable={false} heading="時間割" />
    </div>
  );
}
