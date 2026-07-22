# Tech Stack Decisions — swarm-and-next-stage

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。既存C2 decision choke pointを使い、新技術を追加しない。

## 採用する既存stack

| Concern | Decision | Rationale |
|---|---|---|
| Runtime/Language | Bun 1.3.13 / TypeScript ESM | 既存orchestrator/state/swarm/testsと一致。 |
| Batch source | U02回復済みBoltDag | 第二recovery/fallbackを作らない。 |
| Run evidence | currentRun converged + merge result | stale claimを排除。 |
| Stage source | C1 compiled CompiledGrid | SKIP/in-scope/orderを一本化。 |
| Public API | 正準2 pure seam | signature/failure ownershipを拡張しない。 |
| Testing | `bun:test`、characterization、integration runner | EQUIVALENT/ADAPTを反証可能にする。 |

## 追加しない技術

新dependency、service、database、network、UI、scheduler、priority queue、別DAG resolver、別grid parser、audit event、retention/SLOを追加しない。

## Source・test ownership

pure selection/resolutionはunit、gate projector/engine next/swarm integrationはintegration、FR-0 byte parityはgolden/characterizationで検証する。U12へ全体ledger集約を残す。push前local lcov patch未カバー0と既決spawn/waiver条件を守る。

## トレーサビリティ

各decisionは`business-rules.md`のBR-U03-01〜16、`business-logic-model.md`のPublic seam/Integration、`requirements.md`のNFR-3〜8、`technology-stack.md`に対応する。
