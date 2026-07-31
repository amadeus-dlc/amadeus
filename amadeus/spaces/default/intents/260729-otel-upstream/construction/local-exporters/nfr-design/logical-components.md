# Logical Components — U4: local-exporters

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

NFR 設計（performance/security/scalability/reliability 各 design）の決定がどの論理コンポーネントに適用されるかの対応表。配置は `packages/framework/core/otel/` 配下（tech-stack-decisions.md、U1 ADR-4 の踏襲）。

## コンポーネント目録

| コンポーネント | 責務 | 適用される NFR 設計 | 故障領域（blast radius） |
|---|---|---|---|
| AuditLogExporter | canonical record の lock→sequence→v2 codec encode→同期 append→idempotency 記録 | performance-design（sync append 経路）、reliability-design（耐久性契約） | 書込失敗は同期例外＋latch set で当該 process の canonical mutation 全停止（設計上意図的） |
| LocalSpanExporter | 完成済み Span の Completed Span Store 同期保存 | reliability-design（fail-open・保存完全性） | 保存失敗は当該 Span record の欠落のみ。workflow・canonical 経路に波及しない |
| LocalLogExporter | diagnostic Log の diagnostic Log Store 出力 | reliability-design（fail-open・混入経路なし） | 同上。audit JSONL への混入経路は構造的に存在しない |
| LocalMetricExporter | Counter／Histogram subset の集計と終了時出力 | scalability-design（有界メモリ）、reliability-design（fail-open） | 集計失敗は Metric 欠落のみ |
| Logger Provider 振り分け | Registry 検証（U2 `getEventDef`）→ durability 別 dispatch | performance-design（即時 dispatch）、reliability-design（型上分離） | Registry 拒否は emit 呼出し側の例外に限定 |
| RedactionPolicy 適用点（write-time＋export 境界） | 二層 redaction の本番適用 | security-design（二層設計）、performance-design（性能予算） | policy 誤適用は attrs 欠落に留まる。機微流出は VER-2 ゲートで検出 |
| VER-2 ゲートスキャン | 全 Store 実データの credential-free 検査 CI 配線 | security-design（ゲート設計） | ゲート fail は CI のみで停止。本番実行経路に影響なし |

## コンポーネント境界と分離方針

- canonical 経路（AuditLogExporter）と telemetry 経路（Span/Log/Metric 各 Exporter）は別 Store・別失敗契約（throw+latch vs fail-open）で、障害の相互波及を構造で防ぐ（reliability-design）
- 依存は U2 Registry・U3 v2 codec への一方向のみで、独自語彙・独自 serialize を持たない（tech-stack-decisions.md）
- `core/otel/` 変更のため FR-DST-2 を適用: manifest マッピング登録、`bun scripts/package.ts` で全生成面（7 harness dist＋self-install 面）を再生成し `package.ts --check`／`promote:self:check` を通過する
