import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CalendarDays, DoorOpen, Eye, LogOut, Map, Ban, UserPlus, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { BrandMark, BrandWordmark, ConnectedPill } from "@/components/brand";

export const Route = createFileRoute("/")({
  component: Landing,
});

const FEATURES = [
  { icon: DoorOpen, title: "入室", body: "教室や自由入力の場所に、メモ付きで入室できます。" },
  { icon: Map, title: "場所", body: "フレンドの現在地とメモを一覧で確認できます。" },
  { icon: Users, title: "フレンド", body: "ID、招待リンク、QRコードからつながれます。" },
  { icon: CalendarDays, title: "時間割", body: "授業、バイト、サークルを色付きで管理できます。" },
];

const STEPS = [
  { label: "入室する", title: "場所を選んで、必要ならメモを添える", body: "キャンパス、館、階、教室を選ぶだけで入室できます。" },
  { label: "友達とつながる", title: "IDまたは招待リンクで申請する", body: "フレンド申請を承認すると、相手の場所やチャットが使えます。" },
  { label: "予定を見る", title: "時間割とカレンダーで次の予定を確認する", body: "1限から7限まで登録でき、画像やiCalendarとして出力できます。" },
];

const SAFETY = [
  { icon: Eye, body: "公開範囲はフレンドごとに設定できます" },
  { icon: Ban, body: "フレンド解除で接触を抑止" },
  { icon: LogOut, body: "退室や別の場所への入室で現在地を更新" },
];

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // ログイン済みならアプリへ
  useEffect(() => {
    if (!loading && user) navigate({ to: "/app/location" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-dvh">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <BrandMark className="h-11 w-11" />
            <BrandWordmark className="text-2xl" />
          </Link>
          <Link to="/login" className="rounded-full border border-white/60 bg-white/15 px-5 py-2 font-bold text-white backdrop-blur">
            ログイン
          </Link>
        </div>
      </header>

      {/* ヒーロー：アプリ画面をぼかして背景にする */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 scale-105 blur-[2px]">
          <HeroBackdrop />
        </div>
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-[oklch(0.35_0.03_290/0.55)] via-[oklch(0.3_0.04_290/0.72)] to-[oklch(0.25_0.05_300/0.85)]" />
        <div className="relative mx-auto max-w-3xl px-5 pb-12 pt-44">
          <p className="text-base font-bold text-white">大学生専用</p>
          <h1 className="mt-3 text-5xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-6xl">
            キャンパスで、
            <br />
            <span className="text-[oklch(0.78_0.12_300)]">友達、予定</span>が
            <br />
            すぐ見える。
          </h1>
          <p className="mt-5 text-base leading-relaxed text-white/90">
            入室、場所共有、チャット、時間割をひとつにまとめたキャンパス内位置情報共有アプリです。
          </p>
          <ConnectedPill className="mt-6" />
          <div className="mt-6 space-y-3">
            <Link to="/signup" className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-4 text-lg font-bold text-primary shadow-lg">
              <UserPlus className="h-5 w-5" />
              新規登録
            </Link>
            <Link to="/login" className="flex w-full items-center justify-center rounded-full border border-white/70 py-4 text-lg font-bold text-white">
              ログイン
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-3xl space-y-10 px-5 py-10">
        <section>
          <p className="font-bold text-primary">できること</p>
          <h2 className="mt-1 text-2xl font-extrabold">学内での合流と予定確認を短くする</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="ut-card flex gap-4">
                <span className="ut-soft flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
                  <f.icon className="h-6 w-6" />
                </span>
                <div>
                  <div className="text-lg font-bold">{f.title}</div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <p className="font-bold text-primary">使い方</p>
          <h2 className="mt-1 text-2xl font-extrabold">最初の操作は3つだけ</h2>
          <ol className="mt-5 space-y-3">
            {STEPS.map((s, i) => (
              <li key={s.label} className="ut-card">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="font-bold text-primary">{s.label}</span>
                </div>
                <div className="mt-3 text-lg font-bold">{s.title}</div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="ut-card">
          <h2 className="text-xl font-extrabold">安心して使うために</h2>
          <ul className="mt-4 space-y-3">
            {SAFETY.map((s) => (
              <li key={s.body} className="flex items-center gap-3 text-sm">
                <s.icon className="h-5 w-5 shrink-0 text-primary" />
                {s.body}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-[28px] bg-gradient-to-br from-[oklch(0.38_0.16_318)] to-[oklch(0.26_0.12_318)] p-6 text-center text-white">
          <BrandWordmark className="text-2xl text-white" />
          <p className="mt-2 text-white/85">次の空き時間、誰とどこで過ごすかをすぐ決める。</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link to="/signup" className="rounded-full bg-white py-3 font-bold text-primary">新規登録</Link>
            <Link to="/login" className="rounded-full border border-white/70 py-3 font-bold">ログイン</Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-3xl justify-center gap-6 px-5 pb-10 text-sm text-muted-foreground">
        <Link to="/terms" className="hover:text-primary">利用規約</Link>
        <Link to="/privacy" className="hover:text-primary">プライバシーポリシー</Link>
      </footer>
    </div>
  );
}

/** ヒーロー背景用のアプリ画面イメージ（装飾） */
function HeroBackdrop() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 bg-[oklch(0.96_0.01_290)] px-4 pb-10 pt-24">
      <div className="ut-card">
        <div className="flex items-start justify-between">
          <div>
            <div className="ut-eyebrow">現在地ステータス</div>
            <div className="mt-2 text-3xl font-extrabold leading-snug">今出川キャンパス<br />啓明館 201教室</div>
            <div className="mt-2 text-muted-foreground">入室: 10:30 (現在滞在中)</div>
          </div>
          <span className="rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground">退室する</span>
        </div>
      </div>
      {["明徳館 21番教室", "良心館 ラーニング・コモンズ", "至誠館 S31"].map((r) => (
        <div key={r} className="ut-card">
          <div className="text-xl font-bold">{r}</div>
          <div className="text-muted-foreground">昨日 10:00 - 12:00</div>
        </div>
      ))}
    </div>
  );
}
