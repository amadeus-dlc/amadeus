# Logical Components — U1: otel-walking-skeleton

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

NFR 設計（performance/security/scalability/reliability 各 design）の決定がどの論理コンポーネントに適用されるかの対応表。配置は tech-stack-decisions.md どおり `packages/framework/core/otel/` 新設、`amadeus-lib.ts` には追加しない。

## コンポーネント目録

| コンポーネント | 責務 | 適用される NFR 設計 | 故障領域（blast radius） |
|---|---|---|---|
| bootstrap（`otel/` 入口） | RedactionPolicy・EventRegistry（最小）・FatalLatch 構築、3 Provider 登録、Intent Context 復元 | performance-design（起動コスト抑制） | 起動失敗は当該 process のみ。canonical 経路が使えないため workflow は開始前に停止 |
| Amadeus Tracer Provider | Span 生成・`startActiveSpan()` 契約・Context 維持 | reliability-design（fail-open）、performance-design | Span 保存失敗は fail-open で workflow に影響なし |
| Amadeus Logger Provider | canonical Event の受理・Registry 照合・即時 dispatch | performance-design（同期 dispatch）、reliability-design（耐久性契約） | canonical 書込失敗は同期例外＋latch set で process 全体の mutation を停止 |
| AuditLogExporter | lock→sequence→同期 append→idempotency | performance-design（sync append 経路）、scalability-design（per-clone shard＋mkdir lock） | 失敗時の blast radius は latch により当該 process の canonical mutation 全停止（設計上意図的） |
| LocalSpanExporter / LocalLogExporter | 完成 Span・diagnostic Log の Store 同期保存 | reliability-design（fail-open） | 失敗は当該 record の欠落のみ。workflow・canonical 経路に波及しない |
| RedactionPolicy | write-time／export 境界の二層 redaction（U1 は最小形） | security-design（deny list＋default-deny） | policy 誤適用は attrs 欠落に留まる。機微流出はゲート原型で検出 |
| FatalLatch | process-local の致命的障害フラグ | security-design（改ざん経路なし）、reliability-design（mutation 拒否） | process-local のみ。他 process・他 clone へ波及しない |
| Context 復元（`restoreIntentContext()`） | Intent Trace Context の永続化／復元、remote parent 接続 | performance-design（読取 1 回限定） | 復元失敗は Trace 切断のみで workflow を止めない |

## コンポーネント境界と分離方針

- canonical 経路（Logger Provider → AuditLogExporter）と telemetry 経路（Tracer Provider → LocalSpanExporter、LocalLogExporter、Meter Provider）は別 Exporter・別 Store で、故障が相互に波及しないことを構造で保証する（FR-EXP-4 と整合）
- `core/otel/` 追加は各 harness の manifest マッピングへ登録し、`bun scripts/package.ts` で全生成面を再生成、`package.ts --check`／`promote:self:check` を通過する（FR-DST-2、tech-stack-decisions.md 配布行）
- 共有リソースは audit JSONL の mkdir lock と OTel global API registry の 2 点のみ。いずれも既存機構の再利用で、U1 独自の共有資源を新設しない
