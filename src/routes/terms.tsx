import { createFileRoute } from "@tanstack/react-router";
import { DocShell } from "@/components/auth-shell";
import { LegalDoc } from "@/components/legal-doc";
import { TERMS } from "@/lib/legal";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "利用規約 | UniversityTap" }] }),
  component: () => (
    <DocShell title="利用規約（ユニバーシティタップ／Uタップ）">
      <LegalDoc sections={TERMS} />
    </DocShell>
  ),
});
