import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, Field } from "@/components/auth-shell";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSent(true);
  };

  return (
    <AuthShell title="パスワード再設定">
      {sent ? (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed">
            <span className="font-bold">{email}</span> に再設定用のメールを送信しました。メール内のリンクから新しいパスワードを設定してください。
          </p>
          <Link to="/login" search={{ next: undefined }} className="ut-btn-primary w-full py-4 text-lg">ログインへ戻る</Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <p className="text-sm text-muted-foreground">登録したメールアドレスに、パスワード再設定用のリンクを送ります。</p>
          <Field label="メールアドレス">
            <input className="ut-input" type="email" autoComplete="email" required placeholder="student@university.ac.jp" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <button type="submit" disabled={busy} className="ut-btn-primary w-full py-4 text-lg">
            {busy ? "送信中..." : "再設定メールを送る"}
          </button>
          <Link to="/login" search={{ next: undefined }} className="ut-btn-outline w-full py-4 text-lg">戻る</Link>
        </form>
      )}
    </AuthShell>
  );
}
