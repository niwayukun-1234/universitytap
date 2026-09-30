import { createFileRoute } from "@tanstack/react-router";
import { PageCard } from "@/components/page-card";

export const Route = createFileRoute("/app/news")({
  component: NewsPage,
});

// お知らせは新しい順に先頭へ追加する
const NEWS = [
  { date: "2026-10-01", title: "デザインを新しくしました", body: "入室・フレンド・チャット・場所・時間割の5つのタブで使えるようになりました。フレンドは申請・承認制になりました。" },
  { date: "2026-04-22", title: "時間割の表示を改善しました", body: "1限〜7限まで時間表示付きで見やすくなりました。" },
  { date: "2026-04-15", title: "UniversityTap へようこそ", body: "入室・フレンド・チャット・時間割をご活用ください。" },
];

function NewsPage() {
  return (
    <PageCard eyebrow="メニュー" title="お知らせ">
      <ul className="space-y-3">
        {NEWS.map((n) => (
          <li key={n.date + n.title} className="rounded-2xl border border-border p-4">
            <div className="text-sm text-muted-foreground">{n.date}</div>
            <div className="mt-1 font-bold">{n.title}</div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{n.body}</p>
          </li>
        ))}
      </ul>
    </PageCard>
  );
}
