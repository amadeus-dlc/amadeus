# Build Instructions — 260730-open-bug-batch-2

上流入力(consumes 全数): 6 unit の code-generation-plan.md・code-summary.md(fix-1769-degrade-multiunit / fix-1749-phase-check-name / fix-1734-scopegrid-order / fix-1735-autosolo-protocol / fix-1742-sensor-scope / fix-1750-intent-initialized)— 検証対象・手順・実測証拠は各 unit の plan/summary から導出。

## 手順

1. `bun install --frozen-lockfile` 2. `bun scripts/package.ts`(dist 7ハーネス) 3. `bun run promote:self` 4. `bun run dist:check` / `bun run promote:self:check`(exit 0 必須)

## 実測

実装5 Bolt の worktree で exit 0 を実測、全6 PR の CI(Dist and self-install drift ジョブ)でも exit 0(#1742 は引き取り型のため PR CI のみが検証面)。実測証跡の所在: worktree 実測の exit code 表は各 unit の `construction/<unit>/code-generation/code-summary.md`(検証節)、PR 別の CI 結果と落ちる実証は `build-test-results.md` の Bolt 別表、CI run へのリンクは各 PR(#1774/#1776/#1781/#1782/#1758/#1791)の checks タブが一次記録。
