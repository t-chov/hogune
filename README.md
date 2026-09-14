# Hogune（ホグネ）

URLにストレッチの手順を埋め込んで共有できる、モバイルファーストの静的PWAです。画像は表示せず、種目・動作の音声案内とカウントダウン音で進めます。5種目のVOICEVOX音声とセッション再生を実装しています。音声案内、3秒のカウントダウン、ストレッチ、次の種目の案内の順に進みます。一時停止・再開、ミュート、終了、画面を離れた際の自動停止に対応しています。

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

例: `#/v1/30/10/00D00E00F010011`（トップ画面のリンクからも開けます）

休憩は指定秒数で固定です。指示音声が休憩より長くても、次のストレッチを予定どおり開始し、音声は再生を続けます。最初の種目のみ、音声案内と3秒のカウントダウンを待って開始します。休憩が3秒未満の場合は、その休憩に収まる回数だけカウントダウンします（0秒では省略）。指示音声が次の案内やセッション終了まで続く場合は、その時点で打ち切ります。

プレースホルダーの `00A`〜`00C` は予約済みですが、レビュー済み音声がないため無効です。公開するには動作の説明・読み上げ原稿・VOICEVOX音声・生成記録を追加し、`src/data/exercises.ts` に説明と音声のレビュー情報、実測音声時間を記録して有効化してください。画像の用意は不要です。

## ストレッチメニューと音声原稿

股関節前面・ハムストリングスの左右と広背筋の計5種目（`00D`〜`011`）を登録しています。[メニュー・Web出典・VOICEVOX用コピー原稿](./assets-source/voicevox/README.md)を参照してください。リンク先の種目別TXTは全文をそのままVOICEVOXへコピーできます。音声はユーザーが生成し、動作説明と試聴の確認済みです。

画面ロック中・バックグラウンドでの継続再生は行いません。実機のiPhone・Androidでの音量や画面ロック動作は別途確認が必要です。

## Deployment

`pnpm build` の成果物は `dist/` に生成されます。`wrangler.jsonc` は Cloudflare Workers Static Assets 用で、WorkerコードやAPIは含みません。
