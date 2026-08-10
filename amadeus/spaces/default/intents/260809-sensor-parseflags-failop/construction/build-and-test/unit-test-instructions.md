# Unit Test Instructions — 260809-sensor-parseflags-failop

上流入力(consumes 全数): code-generation-plan.md(実装ステップと検証手順の宣言元)/ code-summary.md(実装面・検証実測の正本)。

## 実行手順

- `bun test tests/unit/t520-sensor-flag-strict-parse.test.ts --timeout=30000`
- 検証対象: `requireFlagValue` の両アーム拒否(end-of-arguments / next-token-flag)+正当列受理+非過剰拒否(ハイフン入り値・`-`)
- 純関数のみ(fs 不使用)— unit 層配置は fs-tests-integration-first に適合

## 参照

- 結果の正本: build-test-results.md(本ステージ内)
