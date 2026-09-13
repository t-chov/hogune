# Hogune（ホグネ）

URLにストレッチの手順を埋め込んで共有できる、モバイルファーストの静的PWAです。現在は [design-doc.md](./design-doc.md) の Phase 1（ドメインプロトタイプ）です。

## Requirements

- Node.js 22以降
- npm 10以降
- 音声時間を検査する場合は `ffprobe`

## Development

```sh
npm install
npm run dev
```

品質チェック:

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

ブラウザテストは初回のみ `npx playwright install` でブラウザを導入してから `npm run test:e2e` を実行します。

## Routine URL

```text
#/v1/<exerciseSeconds>/<intervalSeconds>/<exerciseIds>
```

例: `#/v1/30/5/00A00B00C`

プレースホルダーの `00A`〜`00C` は予約済みですが、レビュー済み素材がないため無効です。公開するには画像・VOICEVOX音声・生成記録を追加し、`src/data/exercises.ts` のレビュー情報を埋めて有効化してください。

## Deployment

`npm run build` の成果物は `dist/` に生成されます。`wrangler.jsonc` は Cloudflare Workers Static Assets 用で、WorkerコードやAPIは含みません。
