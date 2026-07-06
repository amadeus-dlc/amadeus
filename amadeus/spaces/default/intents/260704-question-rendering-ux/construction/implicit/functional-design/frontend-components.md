# Frontend Components — 質問レンダリングのインタラクションフロー

本 unit の「フロントエンド」は CLI harness の構造化質問 UI（Claude Code: AskUserQuestion、Codex: request_user_input、共通: テキストフォールバック）である。
画面コンポーネントは存在しないが、ユーザーと対面するインタラクションフローが本 Intent の主対象であるため、条件付き成果物として設計を記録する。
規則の正準は `business-rules.md` とする。

## フロー 1: mode 選択（`<stage>-questions.md` 作成直後）

| harness | 提示 | 選択肢 |
|---|---|---|
| Claude Code | AskUserQuestion 1 回（4 択） | Guide me（既定・先頭）/ Grill me / I'll edit the file / Chat。label は会話言語の表示訳、記録は正準 label |
| Codex（request_user_input 有効） | request_user_input 1 回（3 択 + custom） | Guide me / Grill me / I'll edit the file。質問本文に「Chat は custom で入力」と明記 |
| フォールバック | テキスト 1 メッセージ | A〜D の番号付き 4 択 + 回答方法の案内 |

## フロー 2: Grill me（一問ずつの interview）

```
questions ファイルの各質問について:
  decision 記録 → 1 呼び出し 1 問で提示
    - 先頭 option = 推奨回答 + 会話言語の推奨マーク
    - 質問本文 = 質問の会話言語訳 + 推奨の根拠 + なぜ今この決定が要るか
    - 選択肢が上限（Claude Code: 4、Codex: 3）を超える場合は分割して続ける
  回答受領 → answer 記録 → [Answer]: 正準ラベル + 表示訳を書き戻し → 次の質問へ
```

「もう少し議論したい」は Claude Code では Other、Codex では custom option が受け皿。議論後に確定した回答を同じ書式で記録する。

## フロー 3: gate 承認

Approve / Request Changes の 2 択は両 harness の上限に収まるため畳み込み不要。表示は会話言語、記録・report は正準 label（既存挙動から表示言語だけが変わる）。

## フロー 4: テキストフォールバック（Codex で request_user_input 不可の場合など）

```
1 メッセージに 1 問だけ提示する:
  Q<n>. <質問の会話言語訳>
    A. <label 訳>（推奨）— <description 訳>
    B. ...
    X. Other (please specify)
  回答案内: 記号（A/B/…）または label で返答してください。
回答受領後: 正準 label へ逆解決し、[Answer]: へ併記で書き戻す。複数問の一括提示はしない。
```

## 不変点

- Claude Code の AskUserQuestion 束縛（spec 1:1 マップ、4 問 × 4 択、Other 組み込み、5 択以上の分割）は変更しない。
- questions ファイルの書式（A〜E + X、`[Answer]:` タグ）は上流のまま維持する。
