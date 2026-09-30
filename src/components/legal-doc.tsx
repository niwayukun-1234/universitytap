import { CONTACT_EMAIL } from "@/lib/config";

export function LegalDoc({ sections }: { sections: { heading: string; paragraphs: string[] }[] }) {
  return (
    <>
      {sections.map((s, i) => (
        <section key={i} className="space-y-1.5">
          {s.heading && <h2 className="pt-2 text-base font-bold">{s.heading}</h2>}
          {s.paragraphs.map((p, j) =>
            p === "__CONTACT__" ? (
              <p key={j}>
                メールアドレス：<a className="font-bold text-primary underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </p>
            ) : (
              <p key={j} className={p.startsWith("・") ? "pl-3" : undefined}>{p}</p>
            ),
          )}
        </section>
      ))}
    </>
  );
}
