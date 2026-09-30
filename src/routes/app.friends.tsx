import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { UserPlus, MessageCircle, Users, QrCode, Copy, Search } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

export const Route = createFileRoute("/app/friends")({
  component: FriendsPage,
});

type FriendRow = {
  friend_id: string;
  profile: { id: string; full_name: string; avatar_url: string | null; faculty: string | null } | null;
  checkin: { classrooms: { name: string } | null; memo: string | null } | null;
};

function FriendsPage() {
  const { user, profile } = useAuth();
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [searchId, setSearchId] = useState("");
  const [result, setResult] = useState<{ id: string; full_name: string; public_id: string } | null>(null);
  const [groupOpen, setGroupOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const inviteUrl = useMemo(() => {
    if (!profile?.public_id) return "";
    return `${window.location.origin}/auth?invite=${profile.public_id}`;
  }, [profile?.public_id]);

  const load = async () => {
    const { data } = await supabase.from("friends").select("friend_id").eq("user_id", user!.id).eq("status", "accepted");
    const ids = (data ?? []).map((f) => f.friend_id);
    if (ids.length === 0) { setFriends([]); return; }
    const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url, faculty").in("id", ids);
    const { data: cks } = await supabase.from("checkins").select("user_id, memo, classrooms(name)").in("user_id", ids).eq("is_active", true);
    setFriends(ids.map((fid) => ({
      friend_id: fid,
      profile: (profs as any)?.find((p: any) => p.id === fid) ?? null,
      checkin: (cks as any)?.find((c: any) => c.user_id === fid) ?? null,
    })));
  };

  useEffect(() => { if (user) load(); }, [user]);

  const searchById = async () => {
    const id = searchId.trim();
    if (!/^\d{8}$/.test(id)) return toast.error("8桁の数字IDを入力してください");
    const { data, error } = await supabase.rpc("search_user_by_public_id", { _public_id: id });
    if (error) return toast.error(error.message);
    const found = (data as any)?.[0];
    if (!found) { setResult(null); return toast.error("該当ユーザーが見つかりません"); }
    if (found.id === user!.id) { setResult(null); return toast.error("自分のIDです"); }
    setResult({ id: found.id, full_name: found.full_name, public_id: found.public_id });
  };

  const addFriend = async (fid: string) => {
    const { error } = await supabase.from("friends").insert([
      { user_id: user!.id, friend_id: fid, status: "accepted" },
      { user_id: fid, friend_id: user!.id, status: "accepted" },
    ]);
    if (error) return toast.error(error.message);
    toast.success("フレンドに追加しました");
    setSearchId(""); setResult(null); setAddOpen(false);
    load();
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteUrl);
    toast.success("招待リンクをコピーしました");
  };
  const copyId = () => {
    if (!profile?.public_id) return;
    navigator.clipboard.writeText(profile.public_id);
    toast.success("IDをコピーしました");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><QrCode className="h-5 w-5 text-primary" />マイID・招待</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-accent/40">
            <div>
              <div className="text-xs text-muted-foreground">あなたの8桁ID</div>
              <div className="text-2xl font-bold tracking-wider text-primary">{profile?.public_id || "----"}</div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={copyId}><Copy className="h-4 w-4 mr-1" />ID</Button>
              <Button size="sm" variant="outline" onClick={copyInvite}><Copy className="h-4 w-4 mr-1" />リンク</Button>
            </div>
          </div>
          {profile?.public_id && (
            <div className="flex justify-center p-3 bg-white rounded-lg border">
              <QRCodeSVG value={inviteUrl} size={140} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />フレンド</span>
            <div className="flex gap-2">
              <CreateGroupDialog friends={friends} open={groupOpen} setOpen={setGroupOpen} />
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><UserPlus className="h-4 w-4 mr-1" />追加</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>IDでフレンドを追加</DialogTitle></DialogHeader>
                  <p className="text-xs text-muted-foreground">相手の8桁IDを入力してください。氏名検索は廃止されました。</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="例: 12345678"
                      value={searchId}
                      maxLength={8}
                      inputMode="numeric"
                      onChange={(e) => setSearchId(e.target.value.replace(/\D/g, ""))}
                      onKeyDown={(e) => e.key === "Enter" && searchById()}
                    />
                    <Button onClick={searchById}><Search className="h-4 w-4" /></Button>
                  </div>
                  {result && (
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <div className="font-semibold">{result.full_name}</div>
                        <div className="text-xs text-muted-foreground">ID: {result.public_id}</div>
                      </div>
                      <Button size="sm" onClick={() => addFriend(result.id)}>追加</Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {friends.length === 0 ? (
            <p className="text-sm text-muted-foreground">フレンドはまだいません。右上の「追加」から検索しましょう。</p>
          ) : (
            <div className="space-y-2">
              {friends.map((f) => (
                <div key={f.friend_id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50">
                  <Link to="/app/friend/$id" params={{ id: f.friend_id }} className="flex items-center gap-3 flex-1">
                    <Avatar>
                      {f.profile?.avatar_url && <AvatarImage src={f.profile.avatar_url} />}
                      <AvatarFallback className="bg-primary text-primary-foreground">{f.profile?.full_name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold">{f.profile?.full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {f.checkin?.classrooms?.name ? `📍 ${f.checkin.classrooms.name}` : "現在地不明"}
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary" />チャットグループ</CardTitle>
        </CardHeader>
        <CardContent>
          <GroupList />
        </CardContent>
      </Card>
    </div>
  );
}

function CreateGroupDialog({ friends, open, setOpen }: { friends: FriendRow[]; open: boolean; setOpen: (b: boolean) => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const create = async () => {
    if (!name.trim()) return toast.error("グループ名を入力してください");
    const { data: g, error } = await supabase.from("chat_groups").insert({ name, created_by: user!.id, is_direct: false }).select().single();
    if (error || !g) return toast.error(error?.message || "失敗");
    const members = [user!.id, ...selected].map((uid) => ({ group_id: g.id, user_id: uid }));
    await supabase.from("group_members").insert(members);
    toast.success("グループを作成しました");
    setOpen(false); setName(""); setSelected([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><MessageCircle className="h-4 w-4 mr-1" />グループ</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>新しいグループ</DialogTitle></DialogHeader>
        <Input placeholder="グループ名" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="space-y-2 max-h-60 overflow-auto">
          <p className="text-sm font-medium">フレンドを追加</p>
          {friends.map((f) => (
            <label key={f.friend_id} className="flex items-center gap-2 p-2 border rounded cursor-pointer">
              <input type="checkbox" checked={selected.includes(f.friend_id)} onChange={(e) => {
                setSelected((s) => e.target.checked ? [...s, f.friend_id] : s.filter((x) => x !== f.friend_id));
              }} />
              <span>{f.profile?.full_name}</span>
            </label>
          ))}
          {friends.length === 0 && <p className="text-sm text-muted-foreground">フレンドを追加してからグループを作成できます</p>}
        </div>
        <DialogFooter>
          <Button onClick={create}>作成</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GroupList() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data: gm } = await supabase.from("group_members").select("group_id").eq("user_id", user!.id);
      const ids = (gm ?? []).map((g) => g.group_id);
      if (ids.length === 0) { setGroups([]); return; }
      const { data } = await supabase.from("chat_groups").select("id,name").in("id", ids).order("created_at", { ascending: false });
      setGroups(data || []);
    })();
  }, [user]);

  if (groups.length === 0) return <p className="text-sm text-muted-foreground">グループはまだありません</p>;
  return (
    <div className="space-y-2">
      {groups.map((g) => (
        <Link key={g.id} to="/app/chat/$id" params={{ id: g.id }} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50">
          <span className="font-medium">{g.name}</span>
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
        </Link>
      ))}
    </div>
  );
}