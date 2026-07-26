# Integration Test Instructions

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(6 unit 分)

## 対象テスト

| Unit | テスト | 検証面 |
|---|---|---|
| fix-1489 | `tests/integration/t292-mirror-distribution-performance.integration.test.ts` | 分散ゲート両側(単一スパイク green / 真の退行 RED) |
| fix-1457/1458 | `tests/integration/t236-election-loop.integration.test.ts`、`t240-election-transport.integration.test.ts` | verify verb 経路+distributed timeline 記録 |
| fix-1459 | `tests/integration/t244-election-tie-choice.integration.test.ts` | tie 判定閉包 |
| fix-1462 | `tests/integration/t-formal-verif-plugin-stage-discovery.integration.test.ts` | dangling symlink 安全 skip(symlinkSync 注入) |
| fix-1377 | `tests/e2e/t07-audit-fork-merge.test.ts`、`tests/e2e/t54-workflow-audit-completeness.test.ts` | audit 経路の閉包 |
| 選挙 e2e | `tests/e2e/t237-election-walking-skeleton.test.ts` | open→notify→report→tally 一巡 |

## 一括実行

一括: `bash tests/run-tests.sh --ci`(smoke+unit+integration、562ファイル)。
