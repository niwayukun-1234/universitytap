import { createFileRoute, redirect } from "@tanstack/react-router";

// 旧URL（/auth, /auth?invite=xxxx）の互換用
export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { invite?: string } => ({ invite: typeof s.invite === "string" ? s.invite : undefined }),
  beforeLoad: ({ search }) => {
    if (search.invite) throw redirect({ to: "/invite/$code", params: { code: search.invite } });
    throw redirect({ to: "/login", search: { next: undefined } });
  },
});
