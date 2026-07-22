# Performance Test Instructions

上流入力(consumes 全数): code-generation-plan.md, code-summary.md

## NFR 由来の性能検証

各ユニットの nfr-design/performance-design.md に由来する検証点:

| 検証点 | 方法 | 閾値/期待 |
| --- | --- | --- |
| Arm S exhaustive 総当たり(5,760+160 cells) | `bun test tests/unit/t-formal-verif-arm-s-run.test.ts` の実測時間 | 単一テストファイルで秒オーダー(タイムアウト既定内) |
| full-matrix suite 実測プロトコル | U7 実装の 1 warmup + 5 measured suites(各120秒上限)— 実 suite 実行は TLC 取得後の実験実行フェーズで実施 | suite ごとの verdict 一致・全 raw sample 保存 |
| fast-check PBT 予算 | seed 20260720 / 100 runs / max 8 actions | 決定論 replay 可能 |

## 注意

- 実験本体のベンチマーク(検出率・CI 実行時間の対照実測)は本 intent の成果物 CLI が担う実験実行の話であり、この build ゲートでは「計測機構が型・テストとして成立していること」を検証する
- 負荷試験・回帰検知の常設 CI ジョブは追加しない(既存 CI gate を汚さない — ci-pipeline は SKIP スコープ)
