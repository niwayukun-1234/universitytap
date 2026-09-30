import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

/** メニューから開くサブページの見出し付きカード */
export function PageCard({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="ut-card">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <Link to="/app/location" aria-label="戻る" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <div className="ut-eyebrow">{eyebrow}</div>
          <h2 className="text-2xl font-extrabold">{title}</h2>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
