import { createFileRoute } from "@tanstack/react-router";
import { DocShell } from "@/components/auth-shell";
import { LegalDoc } from "@/components/legal-doc";
import { PRIVACY } from "@/lib/legal";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "プライバシーポリシー | UniversityTap" }] }),
  component: () => (
    <DocShell title="プライバシーポリシー（ユニバーシティタップ／Uタップ）">
      <LegalDoc sections={PRIVACY} />
    </DocShell>
  ),
});
