import { ReactNode, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { BrandWordmark, ConnectedPill } from "@/components/brand";

/** ログイン・新規登録などの共通レイアウト */
export function AuthShell({ title, children, redirectIfLoggedIn = true }: { title: string; children: ReactNode; redirectIfLoggedIn?: boolean }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (redirectIfLoggedIn && !loading && user) navigate({ to: "/app/location" });
  }, [redirectIfLoggedIn, user, loading, navigate]);

  return (
    // スマホの1画面に収まるよう余白は控えめにする
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-6">
      <Link to="/" className="text-center">
        <BrandWordmark className="text-4xl sm:text-5xl" />
      </Link>
      <p className="mt-1.5 text-center text-sm font-bold text-muted-foreground sm:text-base">大学生専用のキャンパス内位置情報共有</p>
      <ConnectedPill className="mt-3 px-3 py-1 text-xs" />
      <div className="ut-card mt-4 w-full max-w-md p-5">
        <h1 className="text-2xl font-extrabold">{title}</h1>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

/** 利用規約・プライバシーポリシーなど文章ページの共通レイアウト */
export function DocShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-5 py-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => history.length > 1 ? history.back() : (location.href = "/")} className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow" aria-label="戻る">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <BrandWordmark className="text-xl" />
      </div>
      <article className="ut-card mt-5 p-6">
        <h1 className="text-2xl font-extrabold">{title}</h1>
        <div className="mt-4 space-y-4 text-sm leading-relaxed">{children}</div>
      </article>
    </div>
  );
}
