# Performance Requirements — bounded-unit-pool

上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Capacity と Scheduling Targets

`requirements.md` FR-05／08、`business-logic-model.md` のFIFO pool、`business-rules.md` BR-UP-01〜26、`technology-stack.md` の並列度4実測を適用する。

| ID | Target | Default | Hard cap／Acceptance |
|---|---|---:|---|
| PR-UP-01 | active Unit slots | 4 | 4。全観測点で`active <= min(batchSize, configuredCap)` |
| PR-UP-02 | per-invocation override | 未指定 | 1〜resolved capの縮小のみ。拡大要求は拒否 |
| PR-UP-03 | Unit total attempts | 2 | 3。4回目のattempt reserve 0 |
| PR-UP-04 | reconciliation probes per attempt/kind | 2 | 3。cap+1 probe 0 |
| PR-UP-05 | probe timeout | 5秒 | 10秒。canonical lock保持中の待機0秒 |
| PR-UP-06 | queue selection | FIFO head | projection構築後O(1)、retryは末尾 |
| PR-UP-07 | control／treatment | Unit 1と同じ3 warmup＋20 runs | maximum active、duration、attempt、queue順、terminationを報告 |

## Throughput と Resource Constraints

- cap=2／4 Unitのcontrolled worker fixtureでmaximum activeが2、全独立Unitが最終的にterminalになること。
- cap未設定では4、batch sizeが4未満ならbatch sizeをeffective capとする。queued Unitはprocess／agent slotを消費しない。
- Unit settle時にslot releaseと次FIFO acquireを別の人間turnへ依存させず、同じscheduler cycleで評価する。
- DAG validationとKahn orderingはUnit数U、edge数Dに対してO(U+D)。queue／activeの各transitionはO(log U)以下とする。
- review／waiver待ちはworker実装slotを保持しない。Unitのworker result commit時にreleaseする。
- 長時間だが正常なactive workerをwall timeだけでcancelしない。reconciliationはnative lifecycleが不明になった場合だけ開始する。
