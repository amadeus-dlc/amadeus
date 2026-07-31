# 性能テスト手順(performance-test-instructions)

上流入力(consumes 全数): code-generation-plan.md、code-summary.md — 性能面の検査は承認済み NFR(emit レイテンシ・lifecycle 予算)へ trace できる範囲のみ生成した(bt-proportional-selection)。

## 対象と実行

```
bun test ./tests/integration/t258-lifecycle-transaction.test.ts   # lifecycle 予算(median 500/750ms、RSS≤96MiB)
bash tests/run-tests.sh --ci                                       # t259 guard 比計測ほかを含む
```

- **t258**: 100-child spawn の median 予算契約。タイミングは実時間待機でなく counter/短縮シームで決定的に確認する方針(bt-timeout-verification-shape)。inline timeout は hang guard(300s、#1830 経路A解消済み)であり性能アサーションではない
- **emit 経路の性能**: 旧 writer との比較計測ハーネス(otel-phase1-measure)は E-OTELWD-C 裁定で削除済み — Phase 1 の計測値は ADR に固定済みで、以後の退行検知は t258 系の絶対予算と相対 ratchet が担う

## 既知の限界

- t258 経路B(XEON 機種での median 562ms>500)は #1830 に残存 — 予算値は #1424/#1511 裁定ピンのため本 intent では変更しない
