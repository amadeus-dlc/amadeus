# Reliability Design — U11: otlp-relay

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

reliability-requirements.md の目標（workflow 結果不変性・送信ロスなし・重複追跡・非消失・意味生成排除・shadow 撤収条件）に対する設計。

## workflow 結果の不変性設計

- Collector 停止・到達不能・送信 timeout のいずれでも exit は成功とし、workflow の状態遷移・canonical Event・audit 永続化に影響しない（FR-RLY-3、BR-3/BR-10）。送信失敗は例外で伝播させず diagnostics へ記録して次処理へ進む
- canonical 経路（`emitEvent` → AuditLogExporter → audit JSONL）に Relay は介在しない（BR-6）。flush は session-end trigger からの独立実行で、workflow 本体への同期呼び戻しを持たない
- Collector 停止 fixture で結果不変を検証する（VER-3）

## 送信ロスなしの設計

- 送信成功した batch のみ cursor を前進させ、idempotency 記録を更新する。失敗 batch は cursor を戻さず次回 flush の再送対象とし、record を失わない（BR-7、business-logic-model.md § flush 処理シーケンス 5）
- 部分的な送信失敗は batch 単位で分離し、成功分のみ cursor を進める。部分失敗 fixture で cursor 前進分のみ通過を検証する
- retention/rotation は送信済みかつ期限超過 record のみを対象とし、未送信 record を失わない（BR-11）

## 意味生成の排除設計

- Relay は Store record の写像のみを行い、Journal からの Span 再構築・時刻包含・ID 生成を行わない（BR-1/BR-2、FR-RLY-2）
- Journal を読む経路が存在しないことのテスト証明を用意し、削除ゲート FR-MIG-4(e) の入力とする（BR-14）

## shadow 比較の撤収条件設計

- 未説明差分が残る間は shadow 比較ハーネスを撤収しない（BR-12、VER-5）。機械可読 report の差分ゼロ確認を FR-MIG-4(d) ゲート（U8）へ接続する
- 撤収後は比較基盤を残さない（business-logic-model.md § shadow 比較の生成と撤収 3）
- すべての信頼性テストは同一コミット red-green とする（BR-15）
