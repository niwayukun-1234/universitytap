import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Copy, MapPin, MessageSquare, QrCode, ScanLine, Send, UserMinus, UserPlus, Users, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ConnectedPill, UserAvatar } from "@/components/brand";
import { QrScanner, extractInviteCode } from "@/components/qr-scanner";
import { campusName, hhmm, roomLabel } from "@/lib/campus";
import {
  type ActiveCheckin,
  type FriendProfile,
  UNIVERSITY_NAMES,
  acceptedFriendIds,
  activeCheckins,
  openDirectChat,
  profilesByIds,
} from "@/lib/friends";

export const Route = createFileRoute("/app/friends")({
  validateSearch: (s: Record<string, unknown>): { invite?: string } => ({ invite: typeof s.invite === "string" ? s.invite : undefined }),
  component: FriendsPage,
});

type Found = { id: string; full_name: string; public_id: string; university_id: string | null };

function FriendsPage() {
  const { user, profile } = useAuth();
  const { invite } = Route.useSearch();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [checkins, setCheckins] = useState<ActiveCheckin[]>([]);
  const [incoming, setIncoming] = useState<FriendProfile[]>([]);
  const [outgoing, setOutgoing] = useState<FriendProfile[]>([]);
  const [code, setCode] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [scanning, setScanning] = useState(false);

  const inviteUrl = useMemo(
    () => (profile?.public_id && typeof window !== "undefined" ? `${window.location.origin}/invite/${profile.public_id}` : ""),
    [profile?.public_id],
  );

  const load = useCallback(async () => {
    if (!user) return;
    const [ids, inc, out] = await Promise.all([
      acceptedFriendIds(user.id),
      supabase.from("friends").select("user_id").eq("friend_id", user.id).eq("status", "pending"),
      supabase.from("friends").select("friend_id").eq("user_id", user.id).eq("status", "pending"),
    ]);
    const incIds = (inc.data ?? []).map((r) => r.user_id).filter((id) => !ids.includes(id));
    const outIds = (out.data ?? []).map((r) => r.friend_id);
    const [profs, cks] = await Promise.all([profilesByIds([...ids, ...incIds, ...outIds]), activeCheckins(ids)]);
    const pick = (list: string[]) => list.map((id) => profs.find((p) => p.id === id)).filter(Boolean) as FriendProfile[];
    setFriends(pick(ids));
    setIncoming(pick(incIds));
    setOutgoing(pick(outIds));
    setCheckins(cks);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const search = useCallback(
    async (raw: string) => {
      const id = raw.trim();
      if (!/^[0-9A-Za-z]{6,12}$/.test(id)) return toast.error("フレンドコードを正しく入力してください");
      const { data, error } = await supabase.rpc("search_user_by_public_id", { _public_id: id });
      if (error) return toast.error(error.message);
      const hit = (data as Found[] | null)?.[0];
      if (!hit) {
        setFound(null);
        return toast.error("該当するユーザーが見つかりません");
      }
      if (hit.id === user!.id) {
        setFound(null);
        return toast.error("自分のフレンドコードです");
      }
      setFound(hit);
    },
    [user],
  );

  // 招待リンク（/invite/xxxx）から来たらコードを入れて検索
  useEffect(() => {
    if (!invite || !user) return;
    setCode(invite);
    search(invite);
    navigate({ to: "/app/friends", search: { invite: undefined }, replace: true });
  }, [invite, user, search, navigate]);

  const sendRequest = async (target: Found) => {
    if (friends.some((f) => f.id === target.id)) return toast("すでにフレンドです");
    // 相手から申請が届いていれば、そのまま承認する
    if (incoming.some((p) => p.id === target.id)) return accept(target.id);
    const { error } = await supabase.from("friends").insert({ user_id: user!.id, friend_id: target.id, status: "pending" });
    if (error) return toast.error(error.code === "23505" ? "すでに申請済みです" : error.message);
    toast.success(`${target.full_name}さんにフレンド申請を送りました`);
    setCode("");
    setFound(null);
    load();
  };

  const accept = async (fromId: string) => {
    const { error } = await supabase.from("friends").update({ status: "accepted" }).eq("user_id", fromId).eq("friend_id", user!.id);
    if (error) return toast.error(error.message);
    const { error: e2 } = await supabase
      .from("friends")
      .upsert({ user_id: user!.id, friend_id: fromId, status: "accepted" }, { onConflict: "user_id,friend_id" });
    if (e2) return toast.error(e2.message);
    toast.success("フレンドになりました");
    setFound(null);
    setCode("");
    load();
  };

  const decline = async (fromId: string) => {
    const { error } = await supabase.from("friends").delete().eq("user_id", fromId).eq("friend_id", user!.id);
    if (error) return toast.error(error.message);
    load();
  };

  const cancel = async (toId: string) => {
    const { error } = await supabase.from("friends").delete().eq("user_id", user!.id).eq("friend_id", toId);
    if (error) return toast.error(error.message);
    load();
  };

  const unfriend = async (f: FriendProfile) => {
    if (!confirm(`${f.full_name}さんとのフレンドを解除しますか？`)) return;
    await supabase.from("friends").delete().eq("user_id", user!.id).eq("friend_id", f.id);
    await supabase.from("friends").delete().eq("user_id", f.id).eq("friend_id", user!.id);
    toast.success("フレンドを解除しました");
    load();
  };

  const chat = async (f: FriendProfile) => {
    const id = await openDirectChat(user!.id, f);
    if (!id) return toast.error("チャットを開けませんでした");
    navigate({ to: "/app/chat/$id", params: { id } });
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label}をコピーしました`),
      () => toast.error("コピーできませんでした"),
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 border-b border-border/70 pb-4">
        <UserAvatar src={profile?.avatar_url} name={profile?.full_name} className="h-16 w-16" />
        <div className="min-w-0">
          <div className="truncate text-2xl font-extrabold">{profile?.full_name || "未設定"}</div>
          <div className="text-lg text-muted-foreground">{[profile?.faculty, profile?.department].filter(Boolean).join(" ") || "学部未設定"}</div>
        </div>
      </div>
      <div className="flex justify-center">
        <ConnectedPill />
      </div>

      <section className="ut-card">
        <h2 className="ut-card-title text-xl">
          <QrCode className="h-7 w-7 text-primary" />
          マイID・招待
        </h2>
        <div className="mt-4 rounded-3xl bg-brand-soft p-5">
          <div className="text-lg text-muted-foreground">あなたのID</div>
          <div className="mt-1 break-all text-4xl font-extrabold tracking-wide text-primary">{profile?.public_id || "--------"}</div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <SoftButton icon={Copy} label="ID" onClick={() => profile?.public_id && copy(profile.public_id, "ID")} />
            <SoftButton icon={Copy} label="リンク" onClick={() => inviteUrl && copy(inviteUrl, "招待リンク")} />
            <SoftButton icon={QrCode} label="QR" onClick={() => setShowQr((v) => !v)} />
            <SoftButton icon={ScanLine} label="読取" onClick={() => setScanning(true)} />
          </div>
        </div>
        {showQr && inviteUrl && (
          <div className="mt-4 flex justify-center rounded-3xl border border-border bg-white p-6">
            <QRCodeSVG value={inviteUrl} size={220} />
          </div>
        )}
      </section>

      <section className="ut-card">
        <h2 className="ut-card-title text-xl">
          <UserPlus className="h-7 w-7 text-primary" />
          フレンド申請
        </h2>
        <label className="mt-4 block">
          <span className="ut-eyebrow">フレンドコードで検索</span>
          <input
            className="ut-input mt-2 text-lg font-bold tracking-wide"
            placeholder="例: 5788212A"
            value={code}
            maxLength={12}
            autoCapitalize="characters"
            onChange={(e) => {
              setCode(e.target.value.replace(/[^0-9A-Za-z]/g, ""));
              setFound(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && search(code)}
          />
        </label>
        {found ? (
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border p-3">
            <UserAvatar name={found.full_name} className="h-11 w-11" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold">{found.full_name}</div>
              <div className="text-sm text-muted-foreground">{UNIVERSITY_NAMES[found.university_id ?? ""] ?? ""}</div>
            </div>
            <button type="button" onClick={() => sendRequest(found)} className="ut-btn-primary px-4 py-2.5">
              <Send className="h-4 w-4" />
              申請
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => search(code)} className="ut-btn-primary mt-3 w-full py-4 text-lg">
            <Send className="h-5 w-5" />
            申請
          </button>
        )}

        <h3 className="ut-eyebrow mt-6">届いた申請</h3>
        {incoming.length === 0 ? (
          <p className="mt-2 text-muted-foreground">届いている申請はありません</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {incoming.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-border p-3">
                <UserAvatar src={p.avatar_url} name={p.full_name} className="h-11 w-11" />
                <span className="min-w-0 flex-1 truncate font-bold">{p.full_name}</span>
                <button type="button" onClick={() => accept(p.id)} className="ut-btn-primary px-3 py-2" aria-label="承認">
                  <Check className="h-4 w-4" />
                  承認
                </button>
                <button type="button" onClick={() => decline(p.id)} className="ut-btn-outline px-3 py-2" aria-label="拒否">
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <h3 className="ut-eyebrow mt-5">送った申請</h3>
        {outgoing.length === 0 ? (
          <p className="mt-2 text-muted-foreground">送信中の申請はありません</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {outgoing.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-border p-3">
                <UserAvatar src={p.avatar_url} name={p.full_name} className="h-11 w-11" />
                <span className="min-w-0 flex-1 truncate font-bold">{p.full_name}</span>
                <button type="button" onClick={() => cancel(p.id)} className="ut-btn-outline px-3 py-2 text-sm">
                  取り消す
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ut-card">
        <h2 className="ut-card-title text-xl">
          <Users className="h-7 w-7 text-primary" />
          フレンド
        </h2>
        {friends.length === 0 ? (
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">フレンドはまだいません。上の「フレンド申請」から追加しましょう。</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {friends.map((f) => {
              const ck = checkins.find((c) => c.user_id === f.id);
              const b = ck?.classrooms?.buildings;
              return (
                <li key={f.id} className="rounded-3xl border border-border p-4">
                  <Link to="/app/friend/$id" params={{ id: f.id }} className="flex items-center gap-4">
                    <UserAvatar src={f.avatar_url} name={f.full_name} className="h-16 w-16 rounded-2xl" />
                    <div className="min-w-0">
                      <div className="truncate text-xl font-extrabold">{f.full_name}</div>
                      <div className="text-muted-foreground">{UNIVERSITY_NAMES[f.university_id ?? ""] ?? ""}</div>
                    </div>
                  </Link>
                  {ck?.classrooms ? (
                    <div className="ut-soft mt-3 flex gap-3 rounded-2xl px-4 py-3">
                      <MapPin className="mt-0.5 h-5 w-5 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold text-foreground">
                          {campusName(b?.campus)} / {b ? `${b.name} ${roomLabel(ck.classrooms.name, b.name)}` : ck.classrooms.name}
                        </div>
                        <div className="text-muted-foreground">入室 {hhmm(ck.created_at)}</div>
                        {ck.memo && <div className="mt-1 text-sm text-foreground">📝 {ck.memo}</div>}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 rounded-2xl bg-muted px-4 py-3 text-muted-foreground">現在は入室していません</p>
                  )}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Link to="/app/friend/$id" params={{ id: f.id }} className="flex items-center justify-center rounded-full border border-border bg-muted py-3 text-muted-foreground" aria-label="時間割を見る">
                      <CalendarDays className="h-5 w-5" />
                    </Link>
                    <button type="button" onClick={() => chat(f)} className="flex items-center justify-center rounded-full border border-border py-3 text-primary" aria-label="チャット">
                      <MessageSquare className="h-5 w-5" />
                    </button>
                    <button type="button" onClick={() => unfriend(f)} className="flex items-center justify-center rounded-full border border-red-200 bg-red-50 py-3 text-red-700" aria-label="フレンド解除">
                      <UserMinus className="h-5 w-5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {scanning && (
        <QrScanner
          onClose={() => setScanning(false)}
          onResult={(text) => {
            setScanning(false);
            const c = extractInviteCode(text);
            if (!c) return toast.error("UniversityTap の招待QRではありません");
            setCode(c);
            search(c);
          }}
        />
      )}
    </div>
  );
}

function SoftButton({ icon: Icon, label, onClick }: { icon: typeof Copy; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center justify-center gap-2 rounded-2xl bg-card py-3.5 text-lg font-bold shadow-sm transition active:scale-95">
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}
