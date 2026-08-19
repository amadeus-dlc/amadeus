# Performance Test Instructions

## 対象

`code-generation-plan.md` と `code-summary.md` のNFRに従い、Unit集合の正規化とreport検証が入力件数に対して予測可能であることを確認する。外部負荷サービスは使用しない。

## 実行

```sh
bun test --timeout 120000 tests/unit/t532-pr-convergence-provenance.test.ts
bun run coverage:ci
```

## 成功条件

長いprovenance入力の決定的処理が成功し、変更対象の重点テストにtimeoutや非決定的失敗がないこと。全体runnerのwall-clock driftは別途結果へ記録する。
