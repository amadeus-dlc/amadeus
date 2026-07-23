# Code Generation Plan — U3 elections-migration

## 入力とテスト構成

- 要件正本: `inception/requirements-analysis/requirements.md` の FR-3a〜3h
- Unit 正本: `inception/units-generation/unit-of-work.md` の U3
- User Stories: active scope で user-stories stage が SKIP のため入力なし。FR-3a〜3h を直接トレースする
- Unit test: `tests/unit/t262-elections-migration.test.ts`
- Integration test: `tests/integration/t262-elections-migration.integration.test.ts`
- Test config 相当: Bun test runner、`tsconfig.tests.json`、ルート `package.json` の `typecheck` / `lint:check`

## 実装ステップ

- [x] Step 1 — MigrationPlan と createdAt 3段導出を純関数で実装する（FR-3a、FR-3b、FR-3c）
- [x] Step 2 — election.json の electionId を identity とし、既存 registry 行、衝突、冪等スキップを計画へ反映する（FR-3c）
- [x] Step 3 — dry-run を既定とし、全 rename map、衝突、degraded、plan SHA-256 を出力する（FR-3e、FR-3f）
- [x] Step 4 — full clone、S2 着地、open/collecting 不在、撤去 Issue 実在、agmsg 承認 provenance、approved-plan SHA-256 の全条件を fail-closed で検査する（FR-3e、FR-3g、FR-3h）
- [x] Step 5 — per-entry rename→registry append を実装し、選挙 directory 内ファイルを変更しないことを結合テストで固定する（FR-3c）
- [x] Step 6 — execute 後に独立 verify、resolver 全件解決、registry/dir/plan 件数照合を行い、FidelityRecord を Markdown で固定する（FR-3c、FR-3g）
- [x] Step 7 — docs/record の `elections/<旧dir>` 直参照を棚卸しし、FidelityRecord に所有者判断対象として列挙する（FR-3d）
- [x] Step 8 — execution-approval.md への write API 不在と、承認 provenance/hash/Issue の必須性をテストで固定する（FR-3e、FR-3h）
- [x] Step 9 — unit/integration test、typecheck、lint、実データ dry-run を実行し、本番 execute を行わない（FR-3e、FR-3f）

## 実行境界

本番 `--execute`、既存選挙の rename、本番 `elections.json` 生成は leader 経由のユーザー個別承認後のみ実施する。本 Bolt では実行しない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T07:00:31Z
- **Iteration:** 1
- **Scope decision:** none

計画形式、fidelity、承認境界、検証証跡が不足している。

### Findings

- 連番 Step とチェックボックス、要件トレース、テスト手順が不足。
- FidelityRecord と独立 verify の証拠が不足。
- 承認 record の自己生成禁止と必須フィールド検証が不足。
- 検証コマンド、件数、結果が不足。
- timeline fallback 条件と非改変証拠が不足。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T07:00:31Z
- **Iteration:** 2
- **Scope decision:** none

主要実装契約は是正されたが、棚卸し・正式センサー・CI基準線の証跡が不足している。

### Findings

- FR-3d の実データ direct-path 棚卸し件数と出力先が未記録。
- linter、type-check、answer-evidence の正式センサー監査が未記録。
- 全 CI の wall-clock drift が回帰でないことの基準線が未記録。
- 既存 test config が未変更であることが不明瞭。
