# Unit Test Instructions — 260716-t224-size-large

## 上流入力

`code-generation-plan.md` の検証整理(新設テストなし — 検査は既存側)と `code-summary.md` AC-2b に対応。

## 実行手順

- `bun test tests/unit/t-test-size-drift.test.ts tests/unit/t-test-size-dynamic.test.ts`(size 宣言意味論の既存ゲート、42 tests)

## 判定基準

0 fail / exit 0。
