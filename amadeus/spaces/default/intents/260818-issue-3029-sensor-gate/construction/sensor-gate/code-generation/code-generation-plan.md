# Code Generation Plan — sensor-gate

本 Unit は User Stories / Units Generation が scope で SKIP のため、`requirements-analysis/requirements.md` の Issue #3029 intent と FR-1〜FR-8 を直接実装へトレースする。

- [x] Step 1: `amadeus-state.ts` の blocking gate predicate を更新し、`tool-unavailable` を blocking refusal として扱う（FR-1, FR-3）。
- [x] Step 2: 既存の `SENSOR_PASSED` / `Note: tool-unavailable` audit schema と spawn-failed 分岐を維持する（FR-2, FR-4）。
- [x] Step 3: t511 unit evaluator に exit 127 の拒否期待値を追加し、t511 integration の approve success 期待値を refusal へ反転する（FR-6）。
- [x] Step 4: sensor schema、plugin sensor manifest、audit-format の blocking semantics を同期する（FR-7）。
- [x] Step 5: t511 unit/integration と t92 dispatcher regression を実行し、typecheck/lint/build を確認する（FR-5, FR-6, FR-8）。
- [x] Step 6: 既存の Bun test / TypeScript / Biome 設定を確認し、設定ファイルの変更が不要であることを検証する（FR-5, FR-6）。
- [x] Step 7: code-summary.md と pr-convergence-report.md を作成し、許可変更面と未解決事項を記録する（FR-8）。

## 変更面

- 実装: `packages/framework/core/tools/amadeus-state.ts` の gate 述語のみ。
- テスト: `tests/unit/t511-blocking-sensor-severity.test.ts`、`tests/integration/t511-blocking-sensor-gate.integration.test.ts`。t92 は既存契約を実行確認し、必要最小限の変更に限定する。
- 文書: `packages/framework/core/tools/amadeus-sensor-schema.ts` のコメント、`plugins/github-pr-convergence/sensors/amadeus-pr-convergence-report-format.md`、`packages/framework/core/knowledge/amadeus-shared/audit-format.md`。
- 禁止: `amadeus-orchestrate.ts`、`amadeus-bolt.ts`、swarm 系 SKILL.md、`scripts/metrics-publication*`。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-18T09:36:26Z
- **Iteration:** 2
- **Scope decision:** none

前回の BLOCKER は解消済み。code-summary.md と pr-convergence-report.md に、t511 unit のテスト名、spawnFailedOutcome(ENOENT, 1) の期待値 script-error: spawn-failed: ENOENT、blocking evaluator の script-error refusal、対象テストの111 pass / 0 failが明記されている。exit 2もspawn後の非ゼロ終了という別分岐として明確に区別されている。提示された5ファイル間で、FR-1〜FR-8、実装計画、変更概要、検証報告に具体的な契約違反は認められない。

### Findings

- NIT | 指摘なし。
