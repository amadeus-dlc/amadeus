# Logical Components — U9: metrics-subset

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

NFR 設計（performance/security/scalability/reliability 各 design）の決定がどの論理コンポーネントに適用されるかの対応表。配置は `packages/framework/core/otel/`（U1 の配置決定、tech-stack-decisions.md）。

## コンポーネント目録

| コンポーネント | 責務 | 適用される NFR 設計 | 故障領域（blast radius） |
|---|---|---|---|
| `meter-provider.ts` | Meter Provider の global 登録（二重登録は例外）、Meter 取得 | reliability-design（登録契約）、performance-design（起動経路の最小性） | 二重登録例外は起動時に顕在化。登録済み Provider の計測へは影響なし |
| Counter／Histogram instrument | 計測呼出しの受入口、active Context からの IDs 採取 | performance-design（計測経路）、scalability-design（カーディナリティ上限） | 計測失敗は当該 record の欠落のみ（fail-open） |
| `local-metric-exporter.ts`（U4 hardened の利用） | Metric Store（machine-local JSONL）への同期 append | performance-design（1 回 append）、reliability-design（fail-open・耐久性） | 保存失敗は fail-open で吸収。workflow・canonical 経路に波及しない |
| Metric Store | append-only JSONL の追記対象 | reliability-design（更新・削除経路なし）、scalability-design（容量は U11 責務） | Store 障害は fail-open で吸収 |
| subset 型制約 | Counter／Histogram 以外の生成経路を型上排除 | security-design（属性の非機微化の前提）、scalability-design（動的名前生成なし） | 型レベルの制約で runtime 故障領域なし |

## コンポーネント境界と分離方針

- exporter は U4 hardened `LocalMetricExporter`（`export(metric): void` fail-open）をそのまま利用し、差し替え・再実装しない（tech-stack-decisions.md § exporter）
- redaction は U4 の二層 policy が担い、本 Unit のコンポーネントは policy を追加実装しない（security-design § redaction の責務境界）
- Metric 経路は audit JSONL（canonical Journal）と別 Store で、混入経路を持たない（BR-5）。fatal latch 対象の canonical 失敗契約とは完全に分離
- `packages/framework/core/` 変更のため FR-DST-2 を適用: manifest マッピング登録、`bun scripts/package.ts` で全生成面（dist 7 harness・self-install 5 面）を再生成し `package.ts --check`／`promote:self:check` を通過する
