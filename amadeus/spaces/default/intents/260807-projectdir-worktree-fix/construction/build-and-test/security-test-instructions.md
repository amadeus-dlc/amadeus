# Security Test Instructions — 260807-projectdir-worktree-fix

上流入力(consumes 全数): code-generation-plan、code-summary（変更範囲の出典）

## 適用外の宣言（cid:build-and-test:c4 — 検証劇場の禁止）

本 intent の承認済み要件に**セキュリティ NFR は存在しない**。認証・認可・入力境界・秘密情報の取り扱いに変更はない（変更は path 解決梯子の1段のみ。cid:build-and-test:c3 — 攻撃面・依存・承認 NFR の実測明記がある場合のみ検査を比例選定）。

- 適用外の根拠: 新段の入力は `process.cwd()`（プロセス自身の状態）のみで、外部入力・信頼境界を跨ぐデータを消費しない。新規依存の追加なし（`bun install --frozen-lockfile` 差分ゼロ）

新たなセキュリティ試験は**作成しない**。この宣言が本成果物の実体である。

## 患部に対応する既存担保面

1. 本修正自体が**監査整合性の保護**である — worktree セッションの書込が本線 record へ流れる無音汚染経路を閉じ、audit trail の帰属正しさを回復する（実測: 閉包実証 t408 で audit 295 行不変）
2. リポジトリ全体の dependency audit は既存 CI の責務で本変更と独立（cid:build-and-test:c1-doctor-seam — 対象変更の security regression と全体 dependency audit は別判定）
