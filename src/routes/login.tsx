import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, Field } from "@/components/auth-shell";
import { getGuestLoginToken } from "@/lib/guest.functions";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => ({ next: typeof s.next === "string" ? s.next : undefined }),
  component: LoginPage,
});

function LoginPage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "メールアドレスまたはパスワードが違います" : error.message);
      return;
    }
    // 招待リンクなど、ログイン前に開こうとしていたページへ戻す
    if (next && next.startsWith("/")) window.location.href = next;
    else navigate({ to: "/app/location" });
  };

  const onGuest = async () => {
    setBusy(true);
    try {
      const { tokenHash } = await getGuestLoginToken();
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
      if (error) throw error;
      if (next && next.startsWith("/")) window.location.href = next;
      else navigate({ to: "/app/location" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ゲストログインに失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="ログイン" redirectIfLoggedIn={!next}>
      <form onSubmit={onSubmit} className="space-y-5">
        <Field label="メールアドレス">
          <input className="ut-input" type="email" autoComplete="email" required placeholder="student@university.ac.jp" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="パスワード">
          <input className="ut-input" type="password" autoComplete="current-password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm font-bold text-primary">パスワードを忘れた場合</Link>
        </div>
        <button type="submit" disabled={busy} className="ut-btn-primary w-full py-4 text-lg">
          {busy ? "ログイン中..." : "ログイン"}
        </button>
        <Link to="/signup" search={{ next }} className="ut-btn-outline w-full justify-start py-4 text-lg text-primary">
          新規登録
        </Link>
        <button type="button" disabled={busy} onClick={onGuest} className="ut-btn-outline w-full py-4 text-lg">
          ゲストとして試す
        </button>
      </form>
    </AuthShell>
  );
}
