# Performance Test Instructions — docs-impl-sync

上流入力(consumes 全数): code-generation-plan.md(変更面 = docs のみの確認)、code-summary.md(実行時挙動の変更なしの確認)

## 判定: N/A(比例選定 — 実施しない)

本 intent は docs/ + README*.md のみを変更し、実行時コード・性能特性に触れない(全 Bolt の `git status` 実測で packages/ scripts/ tests/ .github/ 無変更を確認済み — code-summary.md § 検証)。承認済み NFR(NFR-1〜4)に性能要件は存在しない。Test Strategy は Minimal(scope `self-document`)。

## 根拠と区別

`cid:build-and-test:bt-proportional-selection` / `cid:build-and-test:c3`(承認済み NFR と実在境界へ trace できる検査のみ生成し、戦略名だけで機械追加しない)に基づき、性能検査は生成しない。本 N/A は反証可能な不存在根拠付きの宣言であり、未検証や PASS の代替表現ではない(`cid:deployment-execution:c3` の区別に準拠)。
