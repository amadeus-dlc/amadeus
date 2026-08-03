# Performance Test手順 — nfr-kind-pruning

## 参照成果物と指標

`code-generation-plan` と `code-summary` が実装したNFR-1は固定wall-clock SLOを持たない。環境・モデル・レビュー回数に左右されない決定的proxyとして、library UnitのNFR必須成果物が各stageで5件から2件へ減ること（60%削減）を合格指標にする。

## 実行方法

```bash
bun test --timeout 120000 \
  tests/integration/t248-stage-contract-routing.test.ts \
  tests/e2e/t416-nfr-kind-pruning.test.ts
```

## 合格条件と回帰判定

library UnitについてNFR Requirements 2件、NFR Design 2件、NFR Design入力3件を観測し、service Unitの各stage 5成果物契約を維持すること。wall-clock値は参考値に留め、機能合否には使用しない。将来の実Intent比較では同じUnit集合・scope・depth・test strategyを固定する。
