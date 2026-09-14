# 股関節・ハムストリングス・広背筋メニュー

作成・Web確認日: 2026-09-14。一般的な柔軟性維持のためのストレッチ案です。股関節は前面の筋肉を対象にしています。痛みやけがの治療用プログラムではありません。

## メニュー

マットと、ひざの下に敷くタオルを用意します。軽い歩行などで5〜10分体を温めてから、以下を各30秒、まず1周行う構成です。保持時間は計2分30秒で、姿勢変更と音声案内は別に必要です。音声時間は生成後に実測するため、総所要時間は未確定です。

| 順番 | ID  | 種目                                   | 保持 | コピーする原稿       | 最終音声の配置先（リポジトリルート基準） |
| ---- | --- | -------------------------------------- | ---- | -------------------- | ---------------------------------------- |
| 1    | 00D | 股関節前面・右（右ひざを床につく）     | 30秒 | [00D.txt](./00D.txt) | `public/exercises/00D/voice.mp3`         |
| 2    | 00E | 股関節前面・左（左ひざを床につく）     | 30秒 | [00E.txt](./00E.txt) | `public/exercises/00E/voice.mp3`         |
| 3    | 00F | あおむけでもも裏・右                   | 30秒 | [00F.txt](./00F.txt) | `public/exercises/00F/voice.mp3`         |
| 4    | 010 | あおむけでもも裏・左                   | 30秒 | [010.txt](./010.txt) | `public/exercises/010/voice.mp3`         |
| 5    | 011 | 腕を前に伸ばすチャイルドポーズ・広背筋 | 30秒 | [011.txt](./011.txt) | `public/exercises/011/voice.mp3`         |

種目間の休憩は最低10秒とする案です。アプリでは次の案内とカウントダウンが収まる長さまで延長します。姿勢変更が間に合わなければ、保持を急いで始めないでください。実施時間をURLで変えられるため、原稿に「30秒」や秒読みは入れていません。

登録予定URL: `#/v1/30/10/00D00E00F010011`

**現在は音声未生成・未レビューのため全5種目が無効で、このURLでは開始できません。セッション再生機能も準備中です。** 既存の予約ID `00A`〜`00C` はそのまま残しています。

## VOICEVOXへコピーする場所

1. 上表の `.txt` を1つ開き、**中身を全文コピー**してください。中身は読み上げる文章だけで、見出しやIDはありません。
2. VOICEVOXのテキスト欄に貼り付け、四国めたんで生成してください。1種目につき1つの音声にまとめます。使用したスタイルとバージョンを記録してください。
3. 左右、発音（特に「広背筋」）、間の取り方、音割れ、画像なしで姿勢を取れるかを確認してください。音量感は5本でそろえます。
4. 最終ファイルはMP3にし、上表の配置先に保存します。WAVで書き出した場合は拡張子の変更ではなくMP3へ変換してください。現在の検査上限は1種目150 KiBです。

原稿の正本は [`src/data/exercises.ts`](../../src/data/exercises.ts) の `voiceTextJa`（`次は、{nameJa}。{instructionJa}`）です。文言や読み方を変更した場合は、種目定義・このフォルダのTXT・対応するメタデータの原稿を一致させてください。

## メニューの根拠と調整

- 股関節前面: [Mayo Clinic — A guide to basic stretches](https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20546848) の Hip flexor stretch を参照。片ひざ立ち、腹部で姿勢を保つ動作、約30秒の保持を採用しました。
- ハムストリングス: [AAOS — Knee Conditioning Program](https://www.orthoinfo.org/recovery/knee-conditioning-program/) の Supine Hamstring Stretch を参照。あおむけでもも裏を支え、ひざの関節を引っ張らない方法と、30〜60秒の範囲から30秒を採用しました。ひざを無理に伸ばし切らない案内を加えています。
- 広背筋: [ACE — Childs Pose](https://www.acefitness.org/resources/everyone/exercise-library/227/childs-pose/) の腕を前へ伸ばす姿勢と30秒〜1分の保持を参照。[Brookbush Institute](https://brookbushinstitute.com/videos/latissimus-dorsi-and-erector-spinae-static-stretch-childs-pose) でも広背筋・脊柱起立筋のストレッチとして扱われています。広背筋だけを単独で伸ばす種目ではありません。床へ無理に押しつけない案内を加えています。

この5種目の順序、各1回、最低10秒休憩はHogune向けの編集案です。出典のリハビリプログラム全体や反復回数を再現したものではありません。出典を参考に日本語の音声案内を独自に構成しており、各団体の監修・推奨を受けたメニューではありません。

軽く伸びる範囲で、反動をつけず呼吸を続けます。痛み・しびれが出たら中止してください。けが、持病、手術後の制限がある場合は医療者に適否を確認してください。ひざ立ちや腕を前へ伸ばす姿勢で痛みが出る種目は省いてください。

## 生成後の記録と有効化

[`assets-source/metadata`](../metadata/) の `00D.json`〜`011.json` に種目ごとの記録欄を用意しました。`null` は未実施・未計測を意味します。

- 生成者がVOICEVOXのバージョン・スタイル・生成日・実際の音量調整設定を記録します。
- 最終MP3を `ffprobe` で計測し、ミリ秒へ丸めた値をメタデータの `measuredDurationMs` と種目定義の `voiceDurationMs` に記録します。
- 人間による動作説明の確認と試聴が完了したら、各レビュー欄に確認者と日付を記録し、種目定義の `review` と `provenance.voiceStyle` を更新して `enabled: true` にします。両レビューの日付が異なる場合、種目定義の `reviewedAt` は両方完了した日とします。
- `pnpm validate:exercises` と `pnpm build` を実行します。音声計測コマンドは値を自動で書き戻しません。

計測例（秒で出力）:

```sh
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 public/exercises/00D/voice.mp3
```
