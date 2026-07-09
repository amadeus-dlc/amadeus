# Code Summary — swarm-finalize-merge (#674)

## 実装

merge-back(`amadeus-bolt complete --merge`)失敗時、対象 unit の `results[]` エントリを `converged` から `failed`/`error` へ降格し、SWARM_UNIT_CONVERGED を出さず SWARM_UNIT_FAILED + SWARM_BATON_RETURNED を出すよう `handleFinalize` を修正。`convergedCount` は merge 成功基準に変更。envelope の `merge_failures` と exit 2 は互換維持、audit taxonomy 変更なし(AC-674-1〜3、選挙 Q1=A)。

## 設計上の発見(要件からの逸脱と根拠)

回帰テストは深掘り分析想定の「add/add 実 git conflict」ではなく、実コード調査で判明した事実(finalize の merge-back パスに git コンテンツレベルのマージは存在せず、`complete --merge` は state/audit/runtime-graph のメタデータ統合)に基づき、同一 unit を out-of-band で先に merge 完了させ `amadeus-state merge` の冪等性ガードで merge-back を実際に失敗させる方式(実 CLI・実コードパス)。hold-merge 不使用の制約(AC-674-4)は遵守。

## 変更ファイル

- `packages/framework/core/tools/amadeus-swarm.ts`(本体)
- dist 4ツリー+self-install の同期(package.ts + promote:self、同一コミット — CR-2)
- `tests/e2e/t134-swarm-referee.test.ts`(回帰テスト case 14)

## 検証(実測 exit code)

| 項目 | 結果 |
|---|---|
| 回帰テスト case 14(修正前) | exit 1(`Received: "converged"` — 落ちる実証) |
| 回帰テスト case 14(修正後) | exit 0 / t134 全体 13 pass |
| typecheck / lint / dist:check / promote:self:check | すべて 0 |
| tests/run-tests.sh --ci | **0**(261 files, 3882 assertions, 0 failed) |

## PR

https://github.com/amadeus-dlc/amadeus/pull/691(Fixes #674)。AC-674-1〜4 充足。
