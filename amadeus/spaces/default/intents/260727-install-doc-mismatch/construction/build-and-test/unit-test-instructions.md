# Unit/Integration Test Instructions — 260727-install-doc-mismatch

上流入力(consumes 全数): code-generation-plan.md(Step 3 のテスト設計)、code-summary.md(実装済みテストの所在)。

## 戦略

Minimal(requirement-driven)。本 intent のリグレッションテストは FR-5 に対応する t307 追加アサート3件(実 FS を使うため integration 層 — cid:code-generation:fs-tests-integration-first)。

## 実行方法

- 対象: `bun test tests/integration/t307-install-artifacts-classes.integration.test.ts`(9 tests — うち3件が #1569 リグレッション)
- 連動面: `bun test tests/integration/t299-plugin-cli-walking-skeleton.integration.test.ts tests/integration/t302-plugin-cli-failure-branches.integration.test.ts tests/integration/t310-check-plugin-projections.integration.test.ts tests/integration/t311-zero-plugin-byte-identical.integration.test.ts tests/integration/t328-adapter-auto-compose-launch.integration.test.ts tests/integration/t338-conformance-recompile-selfheal.integration.test.ts`
- フルスイート: `bash tests/run-tests.sh --ci`

注意: 複数パス指定時は実行前に全パスの実在を機械確認し、実行後に `Ran N tests across M files` を照合する(bun は不存在パスを無音除外 — cid:build-and-test:test-path-set-completeness。本ステージで t310/t311 の旧名指定が 3/5 ファイル実行になる実測があり正名へ是正した)。

## カバレッジ目標

diff 追加実行行の未カバー 0(実測済み — code-summary.md の lcov 節)。
