# Integration Test Instructions

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(fix-1498-envelope-lf)

## 対象

mirror lifecycle 系(guarded create/sync/close 経路のテスト群)と repo 全域回帰: `bash tests/run-tests.sh --ci`(smoke+unit+integration)。CG 時点実測 573 files / 8032 assertions / 0 failed。

## 実運用面の残余

実 GitHub API への end-to-end 疎通(実 mirror create)は CI では実行不能 — verdict で未検証面として明示する(cid:build-and-test:verdict-names-unverified-facets)。
