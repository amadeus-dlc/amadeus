# Unit Test Instructions — 260731-perf-ci-separation

上流入力(consumes 全数): code-generation-plan.md(U1〜U4 の実行計画 — 検証項目の出所)、code-summary.md(U1〜U4 の実装・検証実測 — 本書の対照元。いずれも construction/<unit>/code-generation/ 配下の4面)。

## 対象(本 intent の新設 unit テスト)

- tests/unit/t-run-tests-perf-tier.test.ts(14 tests — parseArgs seam の Red→Green、U1 code-summary.md)
- tests/unit/t-percentile.test.ts(6 tests — 共有 p95 のピン)
- tests/unit/t-guard-corpus-ast.test.ts(分類器 branch coverage)

## 実行と実測

`bash tests/run-tests.sh --ci` に包含(smoke+unit+integration)。2026-08-01 実測: 716 files / 0 failed / 9812 assertions / 0 failed / RESULT PASS(exit 0)
