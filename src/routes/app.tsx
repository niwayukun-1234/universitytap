import { createFileRoute, Link, Outlet, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { MapPin, Users, Calendar, Building2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MailCheck, RefreshCw, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>;
  }

  // Email verification gate
  if (!user.email_confirmed_at) {
    const resend = async () => {
      if (!user.email) return;
      setResending(true);
      const { error } = await supabase.auth.resend({ type: "signup", email: user.email });
      setResending(false);
      if (error) toast.error(error.message);
      else toast.success("確認メールを再送しました");
    };
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-accent/20">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MailCheck className="h-5 w-5 text-primary" />メール確認を完了してください
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
              <div className="font-semibold text-amber-700 dark:text-amber-400">認証ステータス: 未認証</div>
              <div className="text-muted-foreground mt-1">
                <span className="font-medium">{user.email}</span> 宛に確認メールを送信しました。
                メール内のリンクをクリックしてください。
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              メールが届かない場合は、迷惑メールフォルダもご確認ください。確認後、下のボタンで状態を更新できます。
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={resend} disabled={resending} variant="default">
                <RefreshCw className={`h-4 w-4 mr-2 ${resending ? "animate-spin" : ""}`} />
                確認メールを再送
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline">
                認証状態を更新
              </Button>
              <Button onClick={signOut} variant="ghost" size="sm">
                <LogOut className="h-4 w-4 mr-2" />ログアウト
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = [
    { to: "/app/location", label: "位置情報", icon: MapPin },
    { to: "/app/friends", label: "フレンド", icon: Users },
    { to: "/app/places", label: "場所", icon: Building2 },
    { to: "/app/timetable", label: "時間割", icon: Calendar },
  ] as const;

  const initial = (profile?.full_name || "U").slice(0, 1);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/app/profile" className="flex items-center gap-2 hover:opacity-80">
            <Avatar className="h-9 w-9">
              {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} /> : null}
              <AvatarFallback className="bg-primary text-primary-foreground">{initial}</AvatarFallback>
            </Avatar>
            <div className="text-left">
              <div className="text-sm font-semibold">{profile?.full_name || "未設定"}</div>
              <div className="text-xs text-muted-foreground">{profile?.faculty} {profile?.department}</div>
            </div>
          </Link>
          <h1 className="text-sm font-bold text-primary">ユニバーシティタップ</h1>
        </div>
      </header>
      <main className="flex-1 max-w-3xl mx-auto w-full p-4 pb-24">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 inset-x-0 z-30 border-t bg-card">
        <div className="max-w-3xl mx-auto grid grid-cols-4">
          {tabs.map((t) => {
            const active = location.pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex flex-col items-center gap-1 py-3 text-xs transition ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Icon className="h-5 w-5" />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}