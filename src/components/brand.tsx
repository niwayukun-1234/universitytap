import { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const APP_NAME = "UniversityTap";
export const APP_ICON = "/icon-192.png";

/** 紫の丸に角帽アイコン */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.4_0.17_318)] to-[oklch(0.28_0.13_318)] text-primary-foreground shadow-md",
        className,
      )}
    >
      <GraduationCap className="h-1/2 w-1/2" strokeWidth={2.4} />
    </span>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return <span className={cn("font-extrabold tracking-tight text-primary", className)}>{APP_NAME}</span>;
}

/** アイコン画像。未設定なら Uタップのロゴを表示 */
export function UserAvatar({ src, name, className }: { src?: string | null; name?: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  const url = src && !failed ? src : APP_ICON;
  return (
    <img
      src={url}
      alt={name ?? ""}
      onError={() => setFailed(true)}
      className={cn("h-12 w-12 shrink-0 rounded-full border border-border bg-white object-cover", className)}
    />
  );
}

/** 全大学の登録者数の合計 */
export function useConnectedCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    supabase.rpc("get_university_stats").then(({ data, error }) => {
      if (error || !data) return;
      const rows = data as { user_count: number }[];
      setCount(rows.reduce((sum, r) => sum + Number(r.user_count || 0), 0));
    });
  }, []);
  return count;
}

export function ConnectedPill({ className }: { className?: string }) {
  const count = useConnectedCount();
  if (!count) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-success/25 bg-success-soft px-4 py-1.5 text-sm font-bold text-success",
        className,
      )}
    >
      <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.65_0.17_150)] shadow-[0_0_0_4px_oklch(0.65_0.17_150/0.18)]" />
      {count}人が繋がっています
    </span>
  );
}
