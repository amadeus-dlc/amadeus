# Build Test Results — leader-sync-tool(U1)

上流入力: `code-generation-plan.md`、`code-summary.md`

## Green checks

- focused: 35 pass / 0 fail / 124 assertions / 2 files、exit 0。
- lcov: `scripts/amadeus-leader-sync.ts` LF 593 / LH 593。
- typecheck: exit 0。対象 Biome: warning 0 / exit 0。
- coverage registry: freshness / guards / ratchet OK。dist:check: 6 harness OK。
- security grep: `GH_TOKEN|gh pr merge|--shell|shell:` の実装ヒット 0 件。

## Full CI 初回

- `bun run test:ci`: 393 files、5561 assertions、failed files 2、failed assertions 5、exit 2、RESULT FAIL。
- `tests/integration/t-team-up-codex-resume.test.ts` で初回4件、直後の単独実行で11件の 5000ms timeout を観測した。integration verbose 再走では 46 pass / 0 fail となり、実装回帰でなく ambient 時間変動へ帰属した。
- integration verbose 再走: 161 files / 2120 assertions / failed files 1 / failed assertions 1。失敗は `t199-generated-prefix-contract.test.ts` のみ。
- 同テストは最新 main の upstream-sync 成果物9件（codekb 2、upstream-sync intent 5、docs/research 2）にある正当な `aidlc-` 引用を拒んだ。#1312 着地由来で本 intent の実装・AC外のため、Issue #1313 に証拠・影響・再現・完了条件を記録し、leader へ境界判断を依頼した。

## 未完了条件

- `t199-generated-prefix-contract.test.ts` の交差赤を、承認 scope を広げず閉包する責任主体を確定する。
- 最終センサー、独立 reviewer、§13、GitHub CI Success を確認する。
