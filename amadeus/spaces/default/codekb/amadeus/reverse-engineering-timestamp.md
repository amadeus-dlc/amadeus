# リバースエンジニアリング実施記録

## 実行メタデータ

- Date: 2026-07-07
- Time basis: UTC during scan
- Intent: `260707-layout-normalization`
- Scope: `workspace-layout-normalization`
- Repository: `/Users/j5ik2o/.codex/worktrees/f81c/amadeus`
- Observed commit: `bc9a6043`
- Stage: `reverse-engineering`
- Issue focus: GitHub issue #610, workspace/package layout normalization design

## 分析範囲

This refresh focused on repository layout and path-impact evidence for deciding among:

- current root-level framework layout;
- staged layout with `packages/setup` handled separately;
- full workspace normalization such as `packages/<name>/{core,harness,dist,scripts}`.

The scan included:

- `scripts/package.ts`
- `scripts/promote-self.ts`
- `scripts/manifest-types.ts`
- `harness/*/manifest.ts`
- `harness/codex/emit.ts`
- root `dist/*` usage
- root `.claude/.codex/.agents` promotion behavior
- `README.md`
- `docs/guide/harnesses/*`
- `docs/reference/11-contributing.md`
- packaging, promote-self, fixture, codekb, coverage, and docs legacy tests
- `.github/workflows/ci.yml`

## 鮮度に関する注記

The existing CodeKB files were treated as stale for this intent because they reflected prior intent context. They have been refreshed around Issue #610 path-impact analysis.

`packages/` was not present in the checkout during this scan. `packages/setup` is therefore recorded as a sibling dependency for design comparison, not as a local component.

## 更新した成果物

- `business-overview.md`
- `architecture.md`
- `code-structure.md`
- `api-documentation.md`
- `component-inventory.md`
- `technology-stack.md`
- `dependencies.md`
- `code-quality-assessment.md`
- `reverse-engineering-timestamp.md`
