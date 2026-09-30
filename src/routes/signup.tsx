import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, Field } from "@/components/auth-shell";

export const Route = createFileRoute("/signup")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => ({ next: typeof s.next === "string" ? s.next : undefined }),
  component: SignupPage,
});

const UNIVERSITIES = [
  { id: "doshisha", name: "同志社大学", enabled: true },
  { id: "kyoto", name: "京都大学（準備中）", enabled: false },
];

function SignupPage() {
  const { next } = Route.useSearch();
  const [fullName, setFullName] = useState("");
  const [universityId, setUniversityId] = useState("doshisha");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return toast.error("氏名を入力してください");
    if (!UNIVERSITIES.find((u) => u.id === universityId)?.enabled) return toast.error("現在は同志社大学のみご利用いただけます");
    if (!agreed) return toast.error("利用規約とプライバシーポリシーに同意してください");
    setBusy(true);
    const redirectPath = next && next.startsWith("/") ? next : "/app/location";
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${redirectPath}`,
        data: { full_name: fullName.trim(), university_id: universityId },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSentTo(email);
  };

  if (sentTo) {
    return (
      <AuthShell title="メールを確認してください">
        <div className="space-y-4">
          <div className="ut-soft flex items-start gap-3 rounded-2xl p-4">
            <MailCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm leading-relaxed text-foreground">
              <span className="font-bold">{sentTo}</span> に確認メールを送信しました。メール内のリンクを開くと利用を開始できます。
            </p>
          </div>
          <p className="text-sm text-muted-foreground">届かない場合は迷惑メールフォルダもご確認ください。</p>
          <Link to="/login" search={{ next }} className="ut-btn-primary w-full py-4 text-lg">ログインへ</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="新規登録">
      <form onSubmit={onSubmit} className="space-y-5">
        <Field label="氏名">
          <input className="ut-input" required autoComplete="name" placeholder="例: 山田 太郎" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label="大学">
          <select className="ut-input appearance-none" value={universityId} onChange={(e) => setUniversityId(e.target.value)}>
            {UNIVERSITIES.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </Field>
        <Field label="メールアドレス">
          <input className="ut-input" type="email" autoComplete="email" required placeholder="student@university.ac.jp" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="パスワード（6文字以上）">
          <input className="ut-input" type="password" autoComplete="new-password" required minLength={6} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <label className="flex items-start gap-3 text-sm leading-relaxed">
          <input type="checkbox" className="mt-1 h-5 w-5 accent-[oklch(0.36_0.16_318)]" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>
            <Link to="/terms" target="_blank" className="font-bold text-primary underline">利用規約</Link>
            と
            <Link to="/privacy" target="_blank" className="font-bold text-primary underline">プライバシーポリシー</Link>
            に同意します
          </span>
        </label>
        <button type="submit" disabled={busy} className="ut-btn-primary w-full py-4 text-lg">
          {busy ? "登録中..." : "登録する"}
        </button>
        <Link to="/login" search={{ next }} className="ut-btn-outline w-full justify-start py-4 text-lg text-primary">
          ログイン
        </Link>
      </form>
    </AuthShell>
  );
}
