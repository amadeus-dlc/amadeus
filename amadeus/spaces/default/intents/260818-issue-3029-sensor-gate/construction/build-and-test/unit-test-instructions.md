# Unit Test Instructions

## 上流入力

`construction/sensor-gate/code-generation/code-generation-plan.md`、`code-summary.md`、`inception/requirements-analysis/requirements.md` を参照する。

## 実行

- 対象回帰: `bun test --timeout 120000 tests/unit/t511-blocking-sensor-severity.test.ts`
- 重要境界: exit 127 の `tool-unavailable` refusal、spawn-failed の `script-error` refusal、既存の digest/terminal 判定。
- 期待値: 失敗 0。既存 lint warning は test failure と扱わない。

## 網羅性

FR-1/FR-3/FR-4 と NFR-2/NFR-3 を evaluator の unit assertions で検証する。テストは一時 audit text のみを使い、実 record を汚染しない。
