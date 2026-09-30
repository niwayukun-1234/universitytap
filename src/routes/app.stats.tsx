import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageCard } from "@/components/page-card";

export const Route = createFileRoute("/app/stats")({
  component: StatsPage,
});

type Stat = { name: string; university_id: string; user_count: number };

function StatsPage() {
  const [stats, setStats] = useState<Stat[] | null>(null);

  useEffect(() => {
    supabase.rpc("get_university_stats").then(({ data }) => setStats((data as Stat[]) ?? []));
  }, []);

  const total = (stats ?? []).reduce((n, s) => n + Number(s.user_count), 0);
  const max = Math.max(1, ...(stats ?? []).map((s) => Number(s.user_count)));

  return (
    <PageCard eyebrow="メニュー" title="統計">
      <div className="rounded-3xl bg-brand-soft p-5 text-center">
        <div className="text-muted-foreground">登録ユーザー</div>
        <div className="text-5xl font-extrabold text-primary">{stats ? total : "-"}<span className="ml-1 text-xl">人</span></div>
      </div>
      <h3 className="ut-eyebrow mt-6">大学別</h3>
      <ul className="mt-2 space-y-3">
        {(stats ?? []).map((s) => (
          <li key={s.university_id}>
            <div className="flex justify-between font-bold">
              <span>{s.name}</span>
              <span>{s.user_count}人</span>
            </div>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(Number(s.user_count) / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-xs text-muted-foreground">個人を特定できる情報は表示されません。</p>
    </PageCard>
  );
}
