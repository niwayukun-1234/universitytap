# UniversityTap

大学生専用のキャンパス内位置情報共有アプリです。入室、場所共有、フレンド、チャット、時間割をひとつにまとめています。

## 主な機能

- **入室**: キャンパス・館・階・教室を選んで、メモ付きで入室
- **フレンド**: ID・招待リンク・QRコードで申請／承認
- **チャット**: フレンドとの個別チャットとグループチャット
- **場所**: 入室中のフレンドを教室ごとに一覧
- **時間割**: 月〜土・1〜7限。カレンダー（iCalendar）書き出しと画像出力

## 技術構成

- React + TanStack Start + Tailwind CSS
- Supabase（認証・データベース・ストレージ）
- Cloudflare Workers で配信

## 開発

```sh
npm install
npm run dev
```

## デプロイ

```sh
npm run build
npx wrangler deploy --config .output/server/wrangler.json
```
