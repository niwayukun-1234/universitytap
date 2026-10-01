import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  CalendarDays,
  CircleCheck,
  Headset,
  LogOut,
  MailCheck,
  Map,
  MapPin,
  Megaphone,
  Menu,
  MessageSquare,
  RefreshCw,
  Smartphone,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { BrandMark, BrandWordmark, UserAvatar } from "@/components/brand";
import { UNIVERSITY_NAMES } from "@/lib/friends";
import { myGroupIds, unreadByGroup } from "@/lib/unread";
import { demoUnread, isGuest } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

const TABS = [
  { to: "/app/location", label: "入室", icon: MapPin },
  { to: "/app/friends", label: "フレンド", icon: Users },
  { to: "/app/chat", label: "チャット", icon: MessageSquare },
  { to: "/app/places", label: "場所", icon: Map },
  { to: "/app/timetable", label: "時間割", icon: CalendarDays },
] as const;

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login", search: { next: location.href } });
    }
  }, [user, loading, navigate, location.href]);

  if (loading || !user) {
    return <div className="flex min-h-dvh items-center justify-center text-muted-foreground">読み込み中...</div>;
  }

  // ゲスト（匿名ログイン）はメール確認なしで使える
  if (!user.email_confirmed_at && !user.is_anonymous) return <EmailGate />;

  const isChatRoom = /^\/app\/chat\/.+/.test(location.pathname);

  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className={cn("mx-auto w-full max-w-xl px-4 pb-32", isChatRoom && "pb-28")}>
        <Outlet />
      </main>
      <BottomNav pathname={location.pathname} />
    </div>
  );
}

function AppHeader() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const badge = useBadgeCount(user!.id, isGuest(user));
  const install = useInstallState();
  const [notif, setNotif] = useState<NotificationPermission | "unsupported">("default");
  const location = useLocation();

  useEffect(() => {
    setNotif(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  // ページを移動したらメニューを閉じる
  useEffect(() => setOpen(false), [location.pathname]);

  const requestNotification = async () => {
    if (typeof Notification === "undefined") return toast.error("この端末は通知に対応していません");
    if (Notification.permission === "denied") return toast.error("ブラウザの設定から通知を許可してください");
    setNotif(await Notification.requestPermission());
  };

  const logout = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const menu = [
    { icon: UserCog, label: "アカウント設定", to: "/app/profile" as const },
    { icon: Megaphone, label: "お知らせ", to: "/app/news" as const },
    { icon: Headset, label: "お問い合わせ", to: "/app/contact" as const },
    { icon: BarChart3, label: "統計", to: "/app/stats" as const },
  ];

  return (
    <header className="relative z-40">
      <div className="mx-auto flex max-w-xl items-center justify-between px-4 pb-4 pt-5">
        <Link to="/app/location" className="flex items-center gap-3">
          <BrandMark />
          <BrandWordmark className="text-3xl" />
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "メニューを閉じる" : "メニューを開く"}
          className="relative flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card/80 text-primary shadow-sm backdrop-blur"
        >
          {open ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
          {!open && badge > 0 && (
            <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white ring-2 ring-white">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </button>
      </div>

      {open && (
        <>
          <button type="button" aria-label="メニューを閉じる" className="fixed inset-0 z-40 cursor-default bg-black/10" onClick={() => setOpen(false)} />
          <div className="absolute right-4 top-[88px] z-50 w-[min(92vw,380px)] rounded-[28px] bg-card p-4 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-border px-1 pb-4">
              <UserAvatar src={profile?.avatar_url} name={profile?.full_name} className="h-14 w-14" />
              <div className="min-w-0">
                <div className="truncate text-lg font-bold">{profile?.full_name || "未設定"}</div>
                <div className="text-sm text-muted-foreground">{UNIVERSITY_NAMES[profile?.university_id ?? ""] ?? ""}</div>
              </div>
            </div>
            <nav className="mt-3 space-y-2.5">
              {menu.map((m) => (
                <Link key={m.to} to={m.to} className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3.5 font-bold hover:bg-muted">
                  <m.icon className="h-5 w-5 text-primary" />
                  {m.label}
                </Link>
              ))}
              <button type="button" onClick={install.run} className="flex w-full items-center gap-3 rounded-2xl border border-border px-4 py-3 text-left hover:bg-muted">
                {install.installed ? <CircleCheck className="h-5 w-5 text-primary" /> : <Smartphone className="h-5 w-5 text-primary" />}
                <span>
                  <span className="block font-bold">ホーム画面に追加</span>
                  <span className="block text-xs text-muted-foreground">{install.installed ? "追加済み" : "アプリのように使えます"}</span>
                </span>
              </button>
              <button type="button" onClick={requestNotification} className="flex w-full items-center gap-3 rounded-2xl border border-border px-4 py-3 text-left hover:bg-muted">
                <Bell className="h-5 w-5 text-primary" />
                <span>
                  <span className="block font-bold">通知設定</span>
                  <span className="block text-xs text-muted-foreground">
                    {notif === "granted" ? "有効" : notif === "denied" ? "ブロック中" : notif === "unsupported" ? "非対応" : "無効（タップして有効化）"}
                  </span>
                </span>
              </button>
              <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-2xl border border-border px-4 py-3.5 font-bold text-red-700 hover:bg-red-50">
                <LogOut className="h-5 w-5" />
                ログアウト
              </button>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 rounded-t-[28px] bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_-12px_oklch(0.36_0.16_318/0.2)]">
      <div className="mx-auto grid max-w-xl grid-cols-5 gap-1 px-2 py-2.5">
        {TABS.map((t) => {
          const active = pathname.startsWith(t.to) || (t.to === "/app/friends" && pathname.startsWith("/app/friend/"));
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl py-2.5 text-sm font-bold transition",
                active ? "bg-brand-soft text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon className="h-7 w-7" strokeWidth={active ? 2.4 : 2} />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** ハンバーガーの赤バッジ：届いたフレンド申請 + 未読メッセージ */
function useBadgeCount(userId: string, guest: boolean) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    const [{ count: pending }, groups] = await Promise.all([
      supabase.from("friends").select("id", { count: "exact", head: true }).eq("friend_id", userId).eq("status", "pending"),
      myGroupIds(userId),
    ]);
    const unread = { ...(await unreadByGroup(userId, groups)), ...(guest ? demoUnread(userId) : {}) };
    setCount((pending ?? 0) + Object.values(unread).reduce((a, b) => a + b, 0));
  }, [userId, guest]);

  useEffect(() => {
    refresh();
    window.addEventListener("ut:unread-changed", refresh);
    const ch = supabase
      .channel(`badge:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as { user_id: string; content: string | null; group_id: string };
        if (m.user_id === userId) return;
        refresh();
        // チャット画面を開いていないときは端末通知を出す
        if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState === "hidden") {
          new Notification("UniversityTap", { body: m.content || "新しいメッセージがあります", icon: "/icon-192.png" });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "friends", filter: `friend_id=eq.${userId}` }, refresh)
      .subscribe();
    return () => {
      window.removeEventListener("ut:unread-changed", refresh);
      supabase.removeChannel(ch);
    };
  }, [userId, refresh]);

  return count;
}

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** PWA の「ホーム画面に追加」 */
function useInstallState() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const run = async () => {
    if (installed) return toast("すでにホーム画面に追加されています");
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferred(null);
      return;
    }
    toast("ブラウザの共有メニューから「ホーム画面に追加」を選んでください", { duration: 6000 });
  };

  return { installed, run };
}

function EmailGate() {
  const { user, signOut } = useAuth();
  const [resending, setResending] = useState(false);

  const resend = async () => {
    if (!user?.email) return;
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: user.email });
    setResending(false);
    if (error) toast.error(error.message);
    else toast.success("確認メールを再送しました");
  };

  return (
    <div className="flex min-h-dvh items-center justify-center p-5">
      <div className="ut-card w-full max-w-md p-6">
        <h1 className="flex items-center gap-2 text-xl font-extrabold">
          <MailCheck className="h-6 w-6 text-primary" />
          メール確認を完了してください
        </h1>
        <p className="mt-4 text-sm leading-relaxed">
          <span className="font-bold">{user?.email}</span> 宛に確認メールを送信しました。メール内のリンクを開くと利用を開始できます。
        </p>
        <p className="mt-2 text-sm text-muted-foreground">届かない場合は迷惑メールフォルダもご確認ください。</p>
        <div className="mt-5 space-y-3">
          <button type="button" onClick={resend} disabled={resending} className="ut-btn-primary w-full">
            <RefreshCw className={cn("h-4 w-4", resending && "animate-spin")} />
            確認メールを再送
          </button>
          <button type="button" onClick={() => window.location.reload()} className="ut-btn-outline w-full">
            認証状態を更新
          </button>
          <button type="button" onClick={signOut} className="w-full py-2 text-sm text-muted-foreground">
            ログアウト
          </button>
        </div>
      </div>
    </div>
  );
}
