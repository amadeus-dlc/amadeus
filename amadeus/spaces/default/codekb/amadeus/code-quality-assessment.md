# コード品質評価

## 既存の品質ゲート

The repository has meaningful drift protection around 生成済み 出力s.

- `dist:check` validates that commit 済み `dist/<name>` 出力 matches `scripts/package.ts` generation.
- `promote:self:check` validates dogfood self-install state for Claude/Codex surfaces.
- `.github/workflows/ci.yml` runs these checks in CI.
- Unit/integration/e2e tests exercise packaging, Codex 配布物 shape, promote-self preservation, codekb placement, and harness runtime flows.
- Biome and TypeScript provide root-level lint/type gates.

These gates are valuable because `dist/` is commit 済み生成物. A layout 移行 that simply moves files without updating drift checks would create false positives or, worse, remove the checks that catch stale 配布物s.

## 強み

- Current root-centric layout is consistent across packager, docs, tests, and CI.
- Manifest-based projection gives one explicit place per harness to describe 配布物 shape.
- Self-promotion has preservation logic for local settings and composed scopes, reducing data-loss risk.
- Tests centralize many install fixtures in `tests/harness/fixtures.ts` and `tests/harness/tui-fixtures.ts`, which gives a 移行 target if path roots become configurable.

## リスクと技術的負債

| リスク | 影響 | 注記 |
| --- | --- | --- |
| scripts 内の root path 定数 | 高 | `REPO_ROOT`, `CORE_ROOT`, `HARNESS_ROOT`, root `dist` が packaging と promotion に組み込まれている |
| `dist/` が生成物かつ公開 install source であること | 高 | path 移動は user-facing かつ test-facing |
| `scripts/package.ts` から `../core/...` への相対 import | 高 | script と core は独立して移動できない |
| tests が具体的な root path を assert している | 高 | full normalization では広範な test 変更が必要 |
| docs が root layout model を繰り返している | 高 | partial migration では docs が stale になりやすい |
| Codex `.agents` outside `.codex` | 中-high | package-owned layout must preserve multi-root runtime 出力 |
| 既存 CodeKB は intent をまたいで stale になり得る | 中 | 今回は prior intent 中心の scan を Issue #610 の path-impact scan に置き換えた |

## 移行時の安全要件

If implementation proceeds beyond design, the minimum safe order is:

1. Add or document a source-root abstraction before moving directories.
2. Keep `dist:check` and `promote:self:check` passing after each step.
3. Preserve root runtime install targets `.claude`, `.codex`, `.agents`.
4. Update tests and docs in the same phase as any visible path change.
5. Avoid changing `packages/setup` in this intent except as a documented sibling dependency.

## 移行しない選択肢の妥当性

No-移行 is technically viable because the current layout is not accidental; it encodes a simple contributor model:

- edit `core/` for shared behavior;
- edit `harness/<name>/` for integration-specific behavior;
- regenerate and check `dist/`.

If the project keeps this model, the ADR should explicitly state that root-level framework directories are the architecture boundary, while future `packages/*` may hold separately releasable or setup-specific packages.
