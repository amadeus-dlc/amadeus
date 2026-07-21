# Tech Stack Decisions — full-matrix-suite

## Constraints

`business-logic-model.md` のserial benchmark / cost meter、`business-rules.md` のsame conditions、`requirements.md` のreproducibility、`technology-stack.md` のcurrent stackを維持する。benchmark service、database、distributed runnerを追加しない。

## Selected stack

| Concern | Selection | Rationale |
| --- | --- | --- |
| Orchestrator | Bun 1.3.13 / TypeScript ESM | closed schedule / matrix typeを既存stackで実装 |
| Evidence | U3 content-addressed filesystem store | cell / suite raw evidenceをappend-only保持 |
| Arm T / S | U4 / U6 frozen process adapters | same runner contractでserial実行 |
| Timing | injected monotonic clock | suite / cell durationをcommit timeから分離 |
| LOC | isolated Git numstat | arm-owned / shared rowsを再現可能に計測 |
| Control state | U7 `BenchmarkControlStore` filesystem ledger | capacity / execution / resource lease claimとschedule terminal receiptを所有 |
| Tests | `bun:test` + fake clock / process | schedule / timeout / medianを決定的検査 |

## Runner freeze

one-time preparationでT/S runtime snapshots、input set、exclusive cpuset / memory `ResourcePolicyIdentity`、network / filesystem sandbox policyをfreezeし、timer外raw costとidentityを保存する。`BenchmarkControlStore`はU3 evidence payloadとは別namespaceでU7が所有し、U3と同じexpected-head / flush / sync / atomic-rename primitiveを再利用する。scheduleはInputSetIdentityを明示preimageに含め、各IncompleteSuiteもschedule / entry / ordinal / terminal receiptへbindする。

## Rejected additions and checks

parallel suite、adaptive schedule、weighted timing correction、database、remote benchmark serviceを追加しない。typecheck / Biome / bun test / package check、schedule bijection、96/72 cell matrix、5-value median、Git path classificationを検査する。
