# Build Instructions — 260807-merged-pr-convergence

上流入力(consumes 全数): unit landed-report の `code-generation-plan.md`(TDD 計画と裁定)と `code-summary.md`(実装・検証実績 — `construction/landed-report/code-generation/`)。

## 依存とビルド

- Bun / `bun install --frozen-lockfile`。worktree 直後は `bun run build` で self-install を再生成(cid:scope-definition:c3-worktree-selfinstall-bootstrap)。
- ビルド検証: `bun run typecheck`(strict)/ `bun run lint`(Biome)/ `bun tests/complexity-gate.ts --check`。
- `bun run build` 後に追跡ファイル不変(porcelain 検分 — 生成物は未追跡、NFR-3)。

## 対象面

編集正本は `plugins/pr-convergence/tools/`(cli / gh-runner / predicate)+ `packages/framework/core/tools/amadeus-sensor-pr-convergence-report-format.ts` + `plugins/pr-convergence/stages/pr-convergence.md` + tests(t481/t482 新規、t450 追補)。ブランチ `bolt/landed-report`(PR #2414)。
