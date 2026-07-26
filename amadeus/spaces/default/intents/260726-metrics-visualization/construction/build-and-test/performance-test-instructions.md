# Performance Test Instructions — metrics 可視化

上流入力(consumes 全数): code-generation-plan.md, code-summary.md

両 unit の code-generation-plan.md(実施計画・検証手順)と code-summary.md(変更ファイル・検証結果)を検証対象の定義として消費する。

## 方針(bt-proportional-selection — 承認済み NFR へ trace する範囲のみ)

- U1-PERF-01(実用時間完走): 実データ sweep(integration)の完走が検証 — 専用負荷試験は生成しない(nfr-requirements の非対象宣言どおり)
- U2-PERF-03(CI 実測記録): --write 実測 = 123件で 1秒未満(build-test-results.md に記録)。timeout 枠(5分)に対し固定閾値なしの実測比率記録
- 負荷試験・ベンチ基盤: N/A(反証可能な根拠 = nfr-requirements 両 unit の非対象節が明示除外、常駐 service なし)

## 実測記録

- --write 実行時間: 123件で1秒未満(build-test-results.md へ転記済み — U2-PERF-03 の timeout 枠比 <1%)
