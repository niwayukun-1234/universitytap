import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Field } from "@/components/auth-shell";
import { PageCard } from "@/components/page-card";
import { CONTACT_EMAIL } from "@/lib/config";

export const Route = createFileRoute("/app/contact")({
  component: ContactPage,
});

function ContactPage() {
  const { user, profile } = useAuth();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const send = () => {
    if (!subject.trim() || !body.trim()) return toast.error("件名と内容を入力してください");
    const footer = `\n\n---\n${profile?.full_name ?? ""} <${user?.email ?? ""}>`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body + footer)}`;
  };

  return (
    <PageCard eyebrow="メニュー" title="お問い合わせ">
      <p className="text-sm text-muted-foreground">不具合の報告やご要望をお送りください。送信するとメールアプリが開きます。</p>
      <div className="mt-4 space-y-4">
        <Field label="件名">
          <input className="ut-input" value={subject} placeholder="例: 不具合の報告" onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field label="内容">
          <textarea className="ut-input min-h-40 resize-none" value={body} placeholder="お問い合わせ内容をご記入ください" onChange={(e) => setBody(e.target.value)} />
        </Field>
        <button type="button" onClick={send} className="ut-btn-primary w-full py-4 text-lg">
          <Mail className="h-5 w-5" />
          送信する
        </button>
      </div>
    </PageCard>
  );
}
