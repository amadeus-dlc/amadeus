# Unit Test Instructions — 260813-lifecycle-guard-runtime

上流入力: `code-generation-plan.md` Steps 1-2(コア型 TDD)と `code-summary.md` のテスト一覧に対応する unit 層の実行手順。Test Strategy = Comprehensive(要件・リスク・NFR 駆動)。

## 対象

- `tests/unit/t2771-lifecycle-guard-runtime.test.ts`(17 tests)— verdict 語彙(FR-1)、fail-closed 集約と決定的順序(FR-3)、例外→UNKNOWN 写像、context 不変伝搬(FR-4)

## 実行

```sh
bun test tests/unit/t2771-lifecycle-guard-runtime.test.ts   # 単体
bash tests/run-tests.sh --ci                                # 層別ランナー(CI プロファイル)
```

## カバレッジ目標

- Project Coverage Gate(絶対下限 + merge-base 相対、AND 条件)と Patch Coverage Gate は CI で確定。coverage-registry `--check` は exit 0 実測済み(bolt worktree)。
