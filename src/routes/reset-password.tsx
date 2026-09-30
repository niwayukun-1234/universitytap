import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AuthShell, Field } from "@/components/auth-shell";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

/** 再設定メールのリンクから開くページ（リンクでログイン状態になっている） */
function ResetPasswordPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return toast.error("確認用パスワードが一致しません");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("パスワードを変更しました");
    navigate({ to: "/app/location" });
  };

  return (
    <AuthShell title="新しいパスワード" redirectIfLoggedIn={false}>
      {!loading && !user ? (
        <p className="text-sm text-muted-foreground">リンクの有効期限が切れています。もう一度「パスワードを忘れた場合」から再設定メールを送ってください。</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <Field label="新しいパスワード（6文字以上）">
            <input className="ut-input" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="確認用">
            <input className="ut-input" type="password" autoComplete="new-password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          <button type="submit" disabled={busy} className="ut-btn-primary w-full py-4 text-lg">
            {busy ? "変更中..." : "変更する"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
