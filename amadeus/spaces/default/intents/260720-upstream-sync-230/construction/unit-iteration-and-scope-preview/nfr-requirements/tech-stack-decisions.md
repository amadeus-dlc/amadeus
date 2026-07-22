# Tech Stack Decisions — unit-iteration-and-scope-preview

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。既存C2 decision/projector choke pointを使い、新技術を追加しない。

## 採用する既存stack

| Concern | Decision | Rationale |
|---|---|---|
| Runtime/Language | Bun 1.3.13 / TypeScript ESM | 既存state/graph/CLI/testsと一致。 |
| Iteration source | WorkflowState + StageGraph | state verbとcompiled stage順を一本化。 |
| Preview source | ScopeName + C1 CompiledGrid | stage/gate countの第二正本を作らない。 |
| Public API | 正準2 pure seam | signature、failure、mutation ownershipを拡張しない。 |
| Mutation | 既存intent lock/audit transaction | decision seamからwrite policyを分離する。 |
| Testing | `bun:test`、golden byte、integration runner | default compatibilityと4 consumer parityを反証可能にする。 |

## 追加しない技術

新dependency、service、database、network、UI、scheduler、priority queue、別iteration resolver、別grid parser、横断cache、audit event、retention/SLOを追加しない。

## Source・test ownership

pure iteration/preview decisionはunit、state verbと4 projectorはintegration、未指定経路はgolden byteで検証する。Unit kind/schemaはU01、batch/next-stageはU03、ledger集約はU12へ残す。push前local lcov patch追加行未カバー0と既決spawn/waiver条件を守る。

## トレーサビリティ

各decisionは`business-rules.md`のBR-U05-01〜15、`business-logic-model.md`のPublic seam/Integration boundaries、`requirements.md`のNFR-3〜8、`technology-stack.md`に対応する。
