# Integration Test Instructions — tie-choice-resolution

上流入力: `construction/tie-choice-resolution/code-generation/code-generation-plan.md`、`construction/tie-choice-resolution/code-generation/code-summary.md`。Test Strategy は Comprehensive。

## 対象と環境

- Framework: Bun test。
- 対象: `tests/integration/t244-election-tie-choice.integration.test.ts`。
- test ごとの一時 project/store を作り、open→vote→tally→hold-resolved→render/verify の CLI 境界を実ファイルで通す。
- happy path は choice の durable 保存、winner label 描画、hold 履歴を確認する。失敗 path は二値・構文不正・非実在 choice を loud に拒否し、tally bytes が不変であることを確認する。

## 実行と回帰

```sh
bun test tests/integration/t244-election-tie-choice.integration.test.ts
bun test tests/integration/t236-election-loop.integration.test.ts tests/unit/t238-election-record.test.ts tests/e2e/t241-election-machine-executor.test.ts tests/integration/t242-election-skill-vocabulary.integration.test.ts tests/unit/t244-election-choice-resolution.test.ts tests/integration/t244-election-tie-choice.integration.test.ts
```

新規 integration 2 test と関連回帰が全て exit 0 であることを要求する。temp data は test cleanup で除去され、実 store や共有 state を変更しない。
