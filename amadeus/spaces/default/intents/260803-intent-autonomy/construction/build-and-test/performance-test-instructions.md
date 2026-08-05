# Performance Test Instructions — intent-autonomy

## 入力と性能オラクル

各 Unit の `code-generation-plan.md`、`code-summary.md`、`nfr-design/performance-design.md` を入力とする。Issueにlatency・throughputの数値SLOはないため架空の閾値を置かず、bounded state、partition-local replay、linear evaluation、fixed cohortを構造オラクルにする。

## Commands

```sh
bun test --timeout 120000 \
  tests/unit/t426-loop-monitor.test.ts \
  tests/integration/t426-loop-monitor-replay-index.integration.test.ts \
  tests/unit/t428-quality-repair.test.ts \
  tests/integration/t429-quality-repair-runtime.integration.test.ts \
  tests/unit/t431-intent-autonomy.test.ts \
  tests/unit/t433-autonomy-review-observability.test.ts \
  tests/unit/t434-intent-completion.test.ts
```

## Structural performance oracle

- U1はbounded pendingとpartition-local replayを維持し、audit全走査へfallbackしない。
- U2はT+1 windowとbounded attempt 0/1に閉じ、履歴を無制限に蓄積しない。
- U3はprojection indexと決定chainをbounded candidate set上で評価する。
- U4はsnapshot-bound paginationを使い、全decision本文やraw evidenceを複製しない。
- U5はcanonical registry由来の固定cohortをO(H)で評価し、duplicate receiptを増幅しない。

## Regression interpretation

wall-clock変動自体は合否に使わない。unbounded collection、全audit scan、無制限redispatch、cursor drift受理、harness別Core forkをperformance regressionとする。
