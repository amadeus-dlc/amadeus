# Logical Components — U10: diagnostic-logs

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

NFR 設計（performance/security/scalability/reliability 各 design）の決定がどの論理コンポーネントに適用されるかの対応表。配置は `packages/framework/core/otel/` 配下の logger-provider.ts／local-log-exporter.ts（tech-stack-decisions.md、U1 ADR-4 踏襲）。

## コンポーネント目録

| コンポーネント | 責務 | 適用される NFR 設計 | 故障領域（blast radius） |
|---|---|---|---|
| `emitDiagnostic`（logger-provider.ts の公開 Interface） | diagnostic Log の受入口、active Context からの IDs 採取 | performance-design（参照取得のみ）、reliability-design（相関の完全性） | 呼出し側の 1 emit に限定。canonical 経路へ波及しない |
| Logger Provider 振り分け単一点 | canonical（`emitEvent`）と telemetry（`emitDiagnostic`）の routing | reliability-design（routing 境界）、security-design（redaction 通過の強制） | 振り分け誤りは振り分けテストで拒否。混入は契約違反として検出 |
| LocalLogExporter（U4 hardened の利用） | diagnostic Log Store（machine-local JSONL）への同期保存 | performance-design（1 回 append・batch 禁止）、reliability-design（fail-open） | 保存失敗は当該 record の欠落のみ。例外非伝播・latch 未 set |
| redaction 適用点（U4 `redaction.ts` の利用） | export 境界 policy の通過 | security-design（二層設計） | policy 誤適用は attrs 欠落に留まる。機微流出は VER-2 ゲートで検出 |
| diagnostic Log Store | machine-local JSONL の追記対象 | scalability-design（肥大化は U11 責務） | Store 障害は fail-open で吸収。workflow に影響なし |

## コンポーネント境界と分離方針

- canonical 経路（AuditLogExporter）と diagnostic 経路（LocalLogExporter）は別 Store・別失敗契約で、record を共有しない（services.md の通信契約、reliability-design § routing 境界）
- 依存は U1（OTel API・配置）・U4（LocalLogExporter・redaction）・U5（W3C 伝播）への一方向利用のみで、独自実装の複製を持たない（tech-stack-decisions.md）
- Relay（U11）が Store を読み OTLP 変換する際、trace 相関 ID をそのまま通す。本 Unit は Store への保存までを責務とする（business-logic-model.md § Trace Context 相関 3）
- `core/otel/` 変更のため FR-DST-2 を適用: manifest マッピング登録、`bun scripts/package.ts` で全生成面（7 harness dist＋5 self-install 面）を再生成し `package.ts --check`／`promote:self:check` を通過する（VER-6）
