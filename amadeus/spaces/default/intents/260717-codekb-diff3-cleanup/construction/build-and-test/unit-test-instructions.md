# Unit Test Instructions — CodeKB hygiene verification handoff

## 適用範囲

Active Test StrategyはComprehensiveである。ただし`code-generation-plan.md`と`code-summary.md`が示すとおり、新規function / class / module / runtime behaviorは0件であり、新しいunit test fileは追加しない。既存repository suiteを実行し、FR / NFR固有の12-field検査はperformance手順で別に確認する。

## 実行方法

- Test framework: Bun testを包む既存`tests/run-tests.ts`。
- Command: `bun run test:ci`。
- Pass condition: failed test files 0、failed assertions 0、wall-clock drift 0。
- Coverage commands: `bun run coverage:ci`、続いて`bun tests/coverage-project-gate.ts --check`。
- Coverage target: project baseline 40.9395%を下回らず、coverage gateがexit 0であること。根拠のない新規80% targetは導入しない。

## Test dataと結果管理

既存fixture / synthetic data / runner skip policyを変更しない。各testが所有するdata isolationを維持し、live AWS credentialや利用不能なClaude substrateを要求するcaseはrunnerが明示したderived / non-live skipとして、pass数と別に記録する。`code-summary.md`の374 files / 5275 assertionsは比較baselineであり、fresh実測を結果ファイルへ記録する。
