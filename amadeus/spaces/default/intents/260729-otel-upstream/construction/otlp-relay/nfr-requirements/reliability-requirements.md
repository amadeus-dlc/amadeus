# Reliability Requirements — U11: otlp-relay

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## 目標

| 項目 | 目標 | 測定方法 |
|---|---|---|
| workflow 結果の不変性 | Collector 停止・到達不能・送信 timeout のいずれでも exit は成功とし、workflow の状態遷移・canonical Event・audit 永続化に影響しない（FR-RLY-3、BR-3、BR-10） | Collector 停止 fixture で結果不変を検証（VER-3） |
| 送信ロスなし | 送信成功した batch のみ cursor を前進。失敗 batch は cursor を戻さず次回 flush の再送対象とし、record を失わない（BR-7） | 部分失敗 fixture で cursor 前進分のみ通過を検証 |
| 重複の許容と追跡 | 再送の重複は idempotency 記録で検出・追跡し、Collector 側の重複取込を許容する（BR-8） | idempotency 記録 fixture で再送分の検出を検証 |
| retention での非消失 | retention/rotation は送信済みかつ期限超過 record のみを対象とし、未送信 record を失わない（BR-11） | cursor 未通過 record 保持テスト |
| 意味生成の排除 | Relay は Store record の写像のみを行い、Journal からの Span 再構築・時刻包含・ID 生成を行わない（BR-1、BR-2、FR-RLY-2） | Journal を読む経路が存在しないことのテスト証明（BR-14、FR-MIG-4(e) 入力） |
| shadow 比較の撤収条件 | 未説明差分が残る間は shadow 比較ハーネスを撤収しない（BR-12、VER-5） | 機械可読 report の差分ゼロ確認を FR-MIG-4(d) ゲートへ接続 |

## 制約

- canonical 経路（`emitEvent` → AuditLogExporter → audit JSONL）に Relay は介在しない（BR-6）
- lock 取得失敗時は待機・強制取得をせず即時終了する（BR-9）
- すべての信頼性テストは同一コミット red-green とする（BR-15）
