# Build and Test Results — Issue #2976

対象HEAD: `93b7c6a5338fb92f6b10d358c0c9b082f0303576`。上流: `construction/unit-failure-autoelectio/code-generation/code-generation-plan.md` / `code-summary.md`。

## Local results

- `bun test --timeout 120000 tests/unit/t211-swarm-batch-progress.test.ts tests/integration/t369-protocol-autosolo-hook.test.ts tests/e2e/t237-election-walking-skeleton.test.ts`: 48 pass / 0 fail / 369 assertions。
- `bun run typecheck`: exit 0。
- `bunx biome check <変更した3テスト>`: exit 0。
- `git diff --check`: clean。

## CI results

GitHub Actions run 31790806663: `success`。

- Tests: 996 test files、13,430 assertions、failed files 0、failed assertions 0。
- Project coverage: 93.2554%、absolute minimum 90.00%、PASS。
- Patch coverage: measured added lines 62、covered 62、allowlisted 0、uncovered 0、PASS。
- Typecheck、Lint and complexity、Reproducible build、Source-only and graph invariants、Plugin conformance E2E、Intent Mirror distribution contract: すべてPASS。
- Formal model checkはworkflow条件によりskip。後続の専用AIDLC stageで扱う。

## Failures and limitations

失敗0。Node.js 20廃止警告はGitHub Action依存の既存警告で、ジョブ結果へ影響しない。専用の性能・セキュリティ試験は適用NFRがないため非適用。
