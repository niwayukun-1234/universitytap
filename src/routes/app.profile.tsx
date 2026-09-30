import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { LogOut, BarChart3, Mail, Bell } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [faculty, setFaculty] = useState("");
  const [department, setDepartment] = useState("");
  const [circle, setCircle] = useState("");
  const [seminar, setSeminar] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [stats, setStats] = useState<{ name: string; user_count: number }[]>([]);
  const [contactSubject, setContactSubject] = useState("");
  const [contactBody, setContactBody] = useState("");

  const announcements = [
    { date: "2026-04-22", title: "時間割の表示を改善しました", body: "1限〜7限まで時間表示付きで見やすくなりました。" },
    { date: "2026-04-15", title: "ユニバーシティタップへようこそ", body: "教室入室・フレンド・チャット・時間割をご活用ください。" },
  ];

  const sendContact = () => {
    if (!contactSubject.trim() || !contactBody.trim()) return toast.error("件名と内容を入力してください");
    const mailto = `mailto:support@university-tap.app?subject=${encodeURIComponent(contactSubject)}&body=${encodeURIComponent(contactBody + "\n\n---\nFrom: " + (profile?.full_name || "") + " <" + (user?.email || "") + ">")}`;
    window.location.href = mailto;
    toast.success("メールアプリを起動しました");
  };

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name); setFaculty(profile.faculty || ""); setDepartment(profile.department || "");
      setCircle(profile.circle || ""); setSeminar(profile.seminar || ""); setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  useEffect(() => {
    supabase.rpc("get_university_stats").then(({ data }) => setStats((data as any) || []));
  }, []);

  const save = async () => {
    const { error } = await supabase.from("profiles").update({
      full_name: fullName, faculty, department, circle, seminar, avatar_url: avatarUrl,
    }).eq("id", user!.id);
    if (error) return toast.error(error.message);
    toast.success("保存しました");
    refreshProfile();
  };

  const uploadAvatar = async (file: File) => {
    const path = `${user!.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    toast.success("アイコンをアップロードしました");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>プロフィール編集</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {profile?.public_id && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-accent/40">
              <div>
                <div className="text-xs text-muted-foreground">あなたの8桁ID</div>
                <div className="text-xl font-bold tracking-wider text-primary">{profile.public_id}</div>
              </div>
              <span className="text-xs text-muted-foreground">フレンド追加に使用</span>
            </div>
          )}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              {avatarUrl && <AvatarImage src={avatarUrl} />}
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">{fullName.slice(0, 1) || "U"}</AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="avatar" className="cursor-pointer">
                <span className="inline-flex items-center px-3 py-1.5 text-sm border rounded-md hover:bg-accent">アイコン変更</span>
                <Input id="avatar" type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
              </Label>
            </div>
          </div>
          <div><Label>氏名</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>学部</Label><Input value={faculty} onChange={(e) => setFaculty(e.target.value)} /></div>
            <div><Label>学科</Label><Input value={department} onChange={(e) => setDepartment(e.target.value)} /></div>
          </div>
          <div><Label>サークル</Label><Input value={circle} onChange={(e) => setCircle(e.target.value)} /></div>
          <div><Label>ゼミ</Label><Input value={seminar} onChange={(e) => setSeminar(e.target.value)} /></div>
          <div className="flex justify-between">
            <Button onClick={save}>保存</Button>
            <Button variant="outline" onClick={handleSignOut}><LogOut className="h-4 w-4 mr-1" />ログアウト</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />大学別利用者数</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.map((s) => (
              <div key={s.name} className="flex justify-between p-2 border rounded">
                <span>{s.name}</span>
                <span className="font-semibold">{s.user_count}人</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" />お知らせ</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {announcements.map((a) => (
            <div key={a.date + a.title} className="border-l-2 border-primary pl-3 py-1">
              <div className="text-xs text-muted-foreground">{a.date}</div>
              <div className="font-semibold text-sm">{a.title}</div>
              <div className="text-sm text-muted-foreground">{a.body}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" />お問い合わせ</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>件名</Label>
            <Input value={contactSubject} onChange={(e) => setContactSubject(e.target.value)} placeholder="例: 不具合の報告" />
          </div>
          <div>
            <Label>内容</Label>
            <Textarea value={contactBody} onChange={(e) => setContactBody(e.target.value)} placeholder="お問い合わせ内容をご記入ください" rows={4} />
          </div>
          <Button onClick={sendContact} className="w-full"><Mail className="h-4 w-4 mr-2" />送信する</Button>
        </CardContent>
      </Card>
    </div>
  );
}