# Unit Test Instructions — 260814-priority-bug-batch

> Strategy Comprehensive / Depth Minimal。要件・リスク・裁定駆動で code-generation が追加済みのテスト(既存4ファイルへの追記)を対象とする。新規クォータは設けない(FR ごとの検証は実装済み)。

## 実行

```bash
# 患部 targeted(ローカル即時検査)
bun test tests/unit/t07-hook-audit-logger.serial.test.ts
bun test tests/integration/t226-migration-routing-in-process.test.ts   # FR-1/FR-2 の合成 SpawnOutcome 注入
# フルスイート(blocking はリモート CI の ci-success 集約を正とする)
bash tests/run-tests.sh --ci
```

## 観点対応(FR → テスト)

- FR-1: 合成 CommandRunner 注入で部分読み→リトライ回復・上限超過→fail-closed(t226 追記分)
- FR-2: `error` 付き合成 spawn 結果で ok:false(t226:303-339)
- FR-5: t07 の機能 assert(監査レコード有無)のみ、`toBeLessThan` 0 hit
- カバレッジ: CI の Project/Patch Coverage Gate(blocking)を正。ローカルは coverage-patch-quick advisory(実測 added 18 / covered 18)
