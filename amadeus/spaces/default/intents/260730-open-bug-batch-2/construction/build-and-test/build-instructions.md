# Build Instructions — 260730-open-bug-batch-2

上流入力(consumes 全数): 6 unit の code-generation-plan.md・code-summary.md(fix-1769-degrade-multiunit / fix-1749-phase-check-name / fix-1734-scopegrid-order / fix-1735-autosolo-protocol / fix-1742-sensor-scope / fix-1750-intent-initialized)— 検証対象・手順・実測証拠は各 unit の plan/summary から導出。

## 手順

1. `bun install --frozen-lockfile` 2. `bun scripts/package.ts`(dist 7ハーネス) 3. `bun run promote:self` 4. `bun run dist:check` / `bun run promote:self:check`(exit 0 必須)

## 実測

実装5 Bolt の worktree で exit 0 を実測、全6 PR の CI(Dist and self-install drift ジョブ)でも exit 0(#1742 は引き取り型のため PR CI のみが検証面)。
