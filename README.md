# Hogune（ホグネ）

URLにストレッチの手順を埋め込んで共有できる、モバイルファーストの静的PWAです。画像は表示せず、種目・動作の音声案内とカウントダウン音で進めます。現在は [design-doc.md](./design-doc.md) の Phase 1（ドメインプロトタイプ）と確認音の試聴まで実装しています。音声素材とセッション再生機能は準備中です。

## Requirements

- Node.js 22以降
- pnpm 10以降
- 有効な種目がある場合、ビルド時の音声時間検査に `ffprobe` が必要

## Development

```sh
pnpm install
pnpm dev
```

品質チェック:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

ブラウザテストは初回のみ `pnpm exec playwright install` でブラウザを導入してから `pnpm test:e2e` を実行します。

## Routine URL

```text
#/v1/<exerciseSeconds>/<intervalSeconds>/<exerciseIds>
```

例: `#/v1/30/5/00A00B00C`

休憩秒数は最低時間です。0秒を含め、次の種目の音声案内と3秒のカウントダウンに必要な時間まで延長します。種目の実施時間は変わりません。

プレースホルダーの `00A`〜`00C` は予約済みですが、レビュー済み音声がないため無効です。公開するには動作の説明・読み上げ原稿・VOICEVOX音声・生成記録を追加し、`src/data/exercises.ts` に説明と音声のレビュー情報、実測音声時間を記録して有効化してください。画像の用意は不要です。

## Deployment

`pnpm build` の成果物は `dist/` に生成されます。`wrangler.jsonc` は Cloudflare Workers Static Assets 用で、WorkerコードやAPIは含みません。
