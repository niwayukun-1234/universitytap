import { createFileRoute, redirect } from "@tanstack/react-router";

// 招待リンク: フレンド画面を開き、IDを入力済みにする（未ログインならログイン後に戻る）
export const Route = createFileRoute("/invite/$code")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/app/friends", search: { invite: params.code } });
  },
});
