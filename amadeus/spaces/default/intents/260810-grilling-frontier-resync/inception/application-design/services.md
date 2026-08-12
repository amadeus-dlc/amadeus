# Services — grilling frontier 再同期

**Intent**: 260810-grilling-frontier-resync / **Stage**: application-design (2.6)

上流入力(consumes 全数): `requirements.md`(FR-PROTO-9 の annex 写像と FR-DOG-1 の実走形 — 本書の実行時フローの正本)、codekb `architecture.md`(engine/conductor/sensor の実行時役割分担の現況)、codekb `component-inventory.md`(grilling の実行面が conductor 主導・engine 非関与であることのベースライン)。

## 実行時サービス構成(常駐サービスなし)

本 intent は常駐サービス・API を導入しない(CLI/プロトコル文書の世界)。「サービス」は実行時の役割として記述する。

| 役割 | 担い手 | 責務(変更後) |
|---|---|---|
| grilling セッション駆動 | conductor(workflow: Grill me モード)/ main agent(standalone スキル) | design tree の展開・frontier 計算・ラウンド提示・回答反映・枝刈り(depth 指定時)・遮断器監視・合意サマリ |
| 質問配送 | ハーネスの構造化質問レンダリング(annex) | 1コール複数問対応ハーネス(Claude Code AskUserQuestion ≤4問/コール)はラウンド一括、非対応はラウンド内連続提示。ラウンド境界の意味論は protocol(C1)が定義 |
| 事実調達 | サブエージェント(非ブロッキング) | 骨格規定どおり: 調査中ノードの下流のみ待機、frontier の残りは提示継続 |
| 事後検査 | question-budget センサー(C3) | workflow 側 questions ファイルの justification 検査(advisory) |
| CI 契約強制 | t415+新センサーテスト(C4) | 正本文言と機械契約の drift 防止(blocking) |

## オーケストレーションパターン

- **ラウンドループ(orchestration、conductor 所有)**: frontier 計算 → 質問ファイル追記(blank [Answer]、1問1行の既存契約)→ annex 提示 → 回答書き戻し+監査(1問1イベント)→ ツリー再計算 → 遮断器チェック(depth 指定時)→ frontier 空なら合意サマリ(刈りノード列挙含む)。
- **workflow と standalone の差分は §4 相当の overlay 表が一元定義**: workflow = 質問ファイル+監査あり・depth はステージ契約・遮断器あり / standalone = 端末のみ・レベル引数(既定 Free)・Free では遮断器なし。
- 通信はすべて同期・ローカル(ファイル+会話)。非同期はサブエージェント事実調達のみ。

## ライフサイクル・スケール特性

- セッションは human-in-the-loop の会話スコープ(semi/full 自律では Grill me 自体が選択肢から除外 — FR-CONTRACT-5)。
- スケール特性は「1ラウンド = 1人間応答」が構造上界 — 遮断器(depth 指定時 目安×3)がセッション長の桁ガード。Free は人間ゲートと `done` のみ(上流と同一)。
