# Logical Components — U3: journal-v2

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

NFR 設計（performance/security/scalability/reliability 各 design）の決定がどの論理コンポーネントに適用されるかの対応表。配置は `packages/framework/core/tools/amadeus-journal.ts` の拡張（ADR-5、tech-stack-decisions.md）。

## コンポーネント目録

| コンポーネント | 責務 | 適用される NFR 設計 | 故障領域（blast radius） |
|---|---|---|---|
| v2 codec（`serializeJournalEntryV2`／`parseJournalLine`） | v2 record の検証・serialize、schemaVersion 分岐 parse | performance-design（同一次コスト）、security-design（1 行性・未知 version 拒否） | codec 例外（`JournalCodecError`）は呼出し側の 1 record 処理に限定。codec 層自体は状態を持たず汚染が残らない |
| v1/v2 reader | shard の行単位 decode、判別ユニオン `JournalRecord` 返却 | scalability-design（ストリーミング性）、reliability-design（reader-first） | decode 失敗は行番号つき報告で可視化。黙った欠落なし |
| merge | 全 shard 収集・idempotency key dedup・決定的順序付け | reliability-design（no-loss／exactly-once／決定性）、scalability-design（O(N log N)） | 誤った merge は監査表示の欠損・重複に限定され、Journal 本体（shard）は不変 |
| converter（`convertV1ToV2`） | v1 → v2 の純粋変換、変換対象外の明示 | security-design（非合成）、reliability-design（冪等性・スキップ明示） | 変換誤りは変換出力のみに限定。v1 原本は不変 |
| View（`renderJournalView`） | v2 record 列の人間可読描画 | scalability-design（1 回走査）、reliability-design（merge 同順序） | 描画誤りは表示のみ。監査データへ書き戻さない |

## コンポーネント境界と分離方針

- codec 層は filesystem に触れない純粋関数群とし、I/O は呼出し側（U4 AuditLogExporter・U6 共通 reader）に委ねる一方向依存（business-logic-model.md 冒頭、services.md の通信契約）
- `@opentelemetry/*` を直接 import せず、OTel event name・typed attributes は v2 record のデータ形状として扱う（tech-stack-decisions.md § OTel 依存）
- 共有状態を持たず、全コンポーネントは入力 → 出力の純粋写像。障害の波及は呼出し側の 1 処理に閉じる
- `packages/framework/core/tools/` 変更のため FR-DST-2 を適用: manifest マッピング反映、`bun scripts/package.ts` で全生成面（dist 7 面＋self-install）を再生成し `package.ts --check`／`promote:self:check` を通過する
