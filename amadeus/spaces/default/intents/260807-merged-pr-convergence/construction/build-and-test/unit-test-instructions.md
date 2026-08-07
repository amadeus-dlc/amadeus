# Unit Test Instructions — 260807-merged-pr-convergence

上流入力(consumes 全数): unit landed-report の `code-generation-plan.md`(TDD 計画と裁定)と `code-summary.md`(実装・検証実績 — `construction/landed-report/code-generation/`)。

## 対象テストと実行

Comprehensive 戦略だが対象は FR/AC へ trace できる集合のみ(cid:build-and-test:bt-proportional-selection)。

| テスト | trace | seam |
|---|---|---|
| tests/unit/t481-pr-convergence-lifecycle.test.ts(新規) | AC-1b(未知値 throw)/ LandedFacts / labeledVerdict / landedVerdict | 純関数直呼び(FS 非接触) |
| tests/unit/t446-pr-convergence-predicate.test.ts(既存・無改変) | AC-2c(evaluateConvergence / resolveMergeable 不変) | 純関数 |

実行: `bun test <paths>`(実在確認は配列展開 + `Ran ... across M files` 照合 — test-path-set-completeness)。

## カバレッジ

正規判定は PR CI の Project/Patch 両ゲート(local-lcov-pre-push)。patch 赤2回(多行型注釈 DA:0・primed 第2 fetch 未駆動)は単一行型別名化+駆動テスト追加で解消済み(code-summary 参照)。
