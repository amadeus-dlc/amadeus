# Integration Test Instructions — upstream-sync-230

> 上流入力(consumes 全数): 全12ユニットの `code-generation-plan.md`、`code-summary.md`

実 FS・実 CLI 境界を in-process 駆動で検証する integration 層の集約。各ユニットの `code-summary.md` の実測記録に基づく。

## 本 intent の新設 integration テスト

| ファイル | 対象ユニット / 契約 |
|---|---|
| tests/integration/t248-stage-contract-routing.test.ts | U01 — graph/directive/coverage/artifact guard の同一規則適用 |
| tests/integration/t249-workspace-inspection.test.ts | U06 — real-fs nested/submodule fixture、実ソース入り単一 nested の nestedRoot 発火(FR-3 item 11 受け入れ基準) |
| tests/integration/t250-unit-iteration-and-scope-preview.test.ts | U05 — 不正 iteration の mutation 前 reject(state byte 不変) |
| tests/integration/t251-swarm-and-next-stage.test.ts | U03 — swarm-batch-advance characterization(EQUIVALENT)+ gate next_stage 投影 |
| tests/integration/t-plugin-projection-packaging.test.ts | U09 — env 隔離での package 統合、plugin 0件 byte-identical |
| tests/integration/t253-plugin-composition-fs.test.ts | U10 — node backend での compose/drop/recovery |
| tests/integration/t254-reference-plugin-lifecycle.test.ts | U11 — test-pro の build→projection→compose→doctor→drop E2E(temp workspace) |
| tests/integration/t255-upstream-sync-closure.test.ts | U12 — 24項目 evidence sweep + ledger 三条件ゲート |

先行ユニット分(引き継ぎ前完了): t231(U07)、t245(U08)、t246(U04)、t247(U02)。

## 実行と判定

- 実行: `bun test <上表の paths>` または `bash tests/run-tests.sh --ci`(integration プロファイル含む)。実行前に path 実在を機械確認し件数を照合する。
- 判定: 0 fail を green とする。temp workspace を使うテストは tracked tree へ一時生成物を残さないこと(git status で確認)。
