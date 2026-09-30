import { createServerFn } from "@tanstack/react-start";

const GUEST_EMAIL = "guest@unitap.guest";

/** 共有ゲストアカウントを用意し、ワンタイムのログイン用トークンを返す */
export const getGuestLoginToken = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: GUEST_EMAIL });
  if (!error && link?.properties?.hashed_token) return { tokenHash: link.properties.hashed_token };

  // まだゲストが存在しない場合は作成
  const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: GUEST_EMAIL,
    email_confirm: true,
    password: crypto.randomUUID() + crypto.randomUUID(),
    user_metadata: { full_name: "ゲスト", university_id: "doshisha" },
  });
  if (createErr) throw new Error("ゲストアカウントを用意できませんでした");

  const retry = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: GUEST_EMAIL });
  if (retry.error || !retry.data.properties?.hashed_token) throw new Error("ゲストログインに失敗しました");
  return { tokenHash: retry.data.properties.hashed_token };
});
