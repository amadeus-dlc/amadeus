# build-test results（260706-engine-consistency）

上流入力: [build-instructions.md](build-instructions.md) ほか本ステージの instructions 4 件。

## 実行結果（2026-07-06T06:31:23Z、fresh 実行）

| コマンド | 結果 |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run test:all` | exit 0（engine-e2e / docs-codekb-guards / hooks-state-bugfix / pdm-scope / rename-leftovers を含む全連鎖 pass） |
| `npm run parity:check` | ok（39 skills、199 engine files、基準 commit b67798c3） |
| `bun run dev-scripts/evals/engine-e2e/check.ts` | ok（#547 ケース含む） |
| `bun run dev-scripts/evals/docs-codekb-guards/check.ts` | pass（#548 ケース含む） |
| `bun run dev-scripts/evals/hooks-state-bugfix/check.ts` | pass（#555 3 ケース含む） |
| `bun run dev-scripts/evals/pdm-scope/check.ts` | ok（#547 随伴の回帰検査 (f) 含む） |
| validator（260706-engine-consistency 指定） | pass（不足・矛盾なし） |

## TDD 証跡

- B001（#547）: engine-e2e に末尾 skip 連続ケースを先行追加し、実装前 FAIL（Current Stage 残置 / Operation Pending / PHASE_SKIPPED 未記録）を確認後に GREEN。随伴分は pdm-scope eval (f) の `stage "none" not found` FAIL が RED として機能。
- B002（#548）: docs-codekb-guards に stub なしケースを先行追加し、実装前 FAIL を確認後に GREEN（既存 stub 付きケースの pass も維持）。
- B003（#555）: hooks-state-bugfix に 3 ケースを先行追加し、実装前に 2 ケース FAIL を確認後に GREEN 3/3。
詳細は [code-generation-plan.md](../engine-consistency/code-generation/code-generation-plan.md)。

## 失敗と対処

- B001 実装直後の test:all で pdm-scope eval (f) が fail した（`next` が Current Stage: none を stage として解決）。advance finalize 経路由来の潜在バグと特定し、orchestrate.ts の done 解決ガードで修正（code-generation 内で決着、随伴修正として parity 例外 entry に明記）。
- reviewer Low-1（Scope 二重読み）を即修正し、engine-e2e / pdm-scope の再 GREEN を確認した。
