# Logical Components — u3-scope-promotion

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` は engine nfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。唯一存在する `business-logic-model` の既存compile経路をfallback入力として整理する。

## コンポーネント

| Component | 責務 | 障害境界 |
|---|---|---|
| `CoreScopeCatalog` | `packages/framework/core/scopes/` のstock定義15種 | 欠落・重複でcompile失敗 |
| `StageScopeMembership` | `packages/framework/core/amadeus-common/stages/**` frontmatter | 未知scope・タグ漏れをfixtureで検出 |
| `ScopeGridCompiler` | `packages/framework/core/tools/amadeus-graph.ts` のcompile経路 | 不正入力をfail closed |
| `HarnessProjection` | `scripts/package.ts` の `COMPILED_DATA` / `buildTree` | 面ごとのdeep-equalで隔離 |
| `ComposedScopeMerger` | `scripts/promote-self.ts` の `mergeScopeGrid` | per-user extrasを保持 |
| `SelfScopeConsistencySensor` | `packages/framework/core/tools/amadeus-sensor-self-scope-consistency.ts` | driftをCIでloud fail |

## 共有資源と引き渡し

共有資源は追跡済みcore正本とcompile出力だけで、database、network、secretはない。Infrastructure Design では追加資源をN/Aとし、build runnerの既存CPU/disk枠だけを確認する。
