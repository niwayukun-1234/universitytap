import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, Field } from "@/components/auth-shell";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => ({ next: typeof s.next === "string" ? s.next : undefined }),
  component: LoginPage,
});

function LoginPage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"login" | "guest" | null>(null);

  const goNext = () => {
    // 招待リンクなど、ログイン前に開こうとしていたページへ戻す
    if (next && next.startsWith("/")) window.location.href = next;
    else navigate({ to: "/app/location" });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("login");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(null);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "メールアドレスまたはパスワードが違います" : error.message);
      return;
    }
    goNext();
  };

  // ゲストは匿名ログイン（1人ずつ別アカウントになる）
  const onGuest = async () => {
    setBusy("guest");
    const { error } = await supabase.auth.signInAnonymously({
      options: { data: { full_name: "ゲスト", university_id: "doshisha" } },
    });
    setBusy(null);
    if (error) {
      toast.error(/anonymous/i.test(error.message) ? "ゲストログインは現在準備中です" : error.message);
      return;
    }
    goNext();
  };

  return (
    <AuthShell title="ログイン" redirectIfLoggedIn={!next}>
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="メールアドレス">
          <input className="ut-input" type="email" autoComplete="email" required placeholder="student@university.ac.jp" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="パスワード">
          <input className="ut-input" type="password" autoComplete="current-password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm font-bold text-primary">パスワードを忘れた場合</Link>
        </div>
        <button type="submit" disabled={busy !== null} className="ut-btn-primary w-full py-3.5 text-lg">
          {busy === "login" ? "ログイン中..." : "ログイン"}
        </button>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/signup" search={{ next }} className="ut-btn-outline px-2 py-3 text-primary">
            新規登録
          </Link>
          <button type="button" disabled={busy !== null} onClick={onGuest} className="ut-btn-outline px-2 py-3">
            {busy === "guest" ? "準備中..." : "ゲストで試す"}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
