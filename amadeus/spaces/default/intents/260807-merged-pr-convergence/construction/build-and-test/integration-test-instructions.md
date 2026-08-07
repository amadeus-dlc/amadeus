# Integration Test Instructions — 260807-merged-pr-convergence

上流入力(consumes 全数): unit landed-report の `code-generation-plan.md`(TDD 計画と裁定)と `code-summary.md`(実装・検証実績 — `construction/landed-report/code-generation/`)。

## 統合検証面

| テスト | trace |
|---|---|
| tests/integration/t482-pr-convergence-landed.integration.test.ts(新規) | AC-1a/2a/2b/2c/3a/3b + primed 再 fetch 駆動(runCli + scripted GhSpawn + 実 FS record) |
| tests/integration/t448-pr-convergence-cli.integration.test.ts(既存・無改変) | AC-2c(既存3 verb の挙動保存) |
| tests/integration/t450-pr-convergence-report-format-sensor.integration.test.ts(追補) | AC-3c/4a/4b(landed fixture PASS + 違反 FAILED 両側 + merged at タイムスタンプ検証) |
| tests/integration/t447(既存・無改変) | ledger 面の回帰 |

## 実地統合(dogfood)

本 intent 自身の PR #2414 に対し新 CLI の status/report を実行 — `converged: true` 実測・report 生成・`pr-convergence-report-format` センサー PASSED(audit 実測)。これは converged 経路の end-to-end 実地検証であり、landed 経路の実機検証はマージ後の PR に対する実行が初出になる(申し送り参照)。
