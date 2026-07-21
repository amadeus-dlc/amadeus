# Tech Stack Decisions — reference-plugin-and-guides

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。既存plugin pipelineとdocs/test stackを使用し、新技術を追加しない。

## 採用する既存stack

| Concern | Decision | Rationale |
|---|---|---|
| Runtime/Language | Bun 1.3.13 / TypeScript ESM | 既存package/compiler/CLI/testsと一致。 |
| Authoring source | canonical `plugins/test-pro/` | generated projectionの第二正本を作らない。 |
| Validation/projection | U01 schema + U09 packager | parser/projectorを重複実装しない。 |
| Lifecycle | U10 inspect/plan/apply/doctor/drop | no-clobber/atomic/drop意味論を再定義しない。 |
| Testing | `bun:test`、integration/E2E runner、temp filesystem | 単一lifecycleとtracked cleanupを反証可能にする。 |
| Documentation | 既存reference/authoring guide面 | Amadeus pathと6/4差を既存規約で記録する。 |

## 追加しない技術

新runtime API/dependency、service、database、network、UI、第二plugin runtime、marketplace、lockfile、agents/scopes/memory/knowledge、`when` evaluator、audit event、retention/SLOを追加しない。

## Source・test ownership

fixture input/expected declarative outcomesとitems 21–22 evidenceだけをU11が所有する。projectionはU09、compose/drop/doctorはU10、ledger closureはU12へ残す。具体slug、表示文言、fixture pathを契約化しない。push前local lcov patch追加行未カバー0と既決spawn/waiver条件を守る。

## トレーサビリティ

各decisionは`business-rules.md`のBR-U11-01〜12、`business-logic-model.md`のPurpose/Lifecycle/Guide、`requirements.md`のNFR-3〜8、`technology-stack.md`に対応する。
