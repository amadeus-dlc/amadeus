# Scope Document — upstream-sync-230

上流入力(consumes 全数): intent-statement(`../intent-capture/intent-statement.md`)、feasibility-assessment(`../feasibility/feasibility-assessment.md`)、constraint-register(`../feasibility/constraint-register.md`)

## In Scope(境界内)

intent-statement の Success Metrics と1:1 に対応する、承認済み計画(`docs/research/upstream-sync/reports/v2.2.0-to-v2.3.0-plan.md`、ledger 8/8 APPROVED)の **24 ADOPT/ADAPT 項目**:

| ドメイン | 項目数 | 内容 |
|---|---|---|
| D1 エンジン正しさ修正 | 6 | bolt-dag-selfheal / gate-revision-backstop / swarm-batch-advance(検証先行)/ help-routing(検証先行)/ compose-pending-freshness / recompose-autonomy-guard |
| D2 エンジン機能 | 4 | unit-kind-pruning / unit-major-iteration / scope-cost-preview / gate-next-stage-naming(検証先行) |
| D3 workspace 検出 | 2 | nested-root-detection / submodule-detection |
| D4 ハーネス統合 | 3 | execpath-spawn / kiro-ide-hook-context(検証先行)/ project-dir-quoting |
| D5 レビュアー品質 | 2 | reviewer-date-persona / reviewer-read-scope |
| D6 プラグイン機構 | 5 | stage-schema-extensions / packager-plugin-projection / plugin-compose-hook / test-pro-reference-plugin / plugin-docs |
| D7 テスト | 1 | ported-tests(採用項目対応の再著作) |
| D8 docs | 1 | docs-updates(採用機能分のみ) |

feasibility-assessment の GO 判定(無条件)と constraint-register の制約(T1-T6 / O1-O4 / R1-R2)を境界条件として引き継ぐ。

## Out of Scope(境界外)

- 計画 SKIP 6件: optional-produces / agent-model-key / learnings-memory-path(EQUIVALENT 実証済み)、dist-trees / roadmap-html / upstream-changelog(生成物・フォーク固有)
- upstream 側でも deferred のプラグイン面: plugin の agents/scopes/memory/knowledge 投影、`adds.scopes`/`adds.requires_stage`、`when:` 評価、marketplace/managed-settings/lockfile、Kiro `.kiro.hook` 自動発火 CLI
- pre-2.2.0 の upstream 同等性認証(baseline は REVIEWED)
- upstream への還流(コントリビュート)・リリース発行(release.yml は別運用)

## MoSCoW 区分

- **Must**: 24 ADOPT/ADAPT 全項目(計画のディスポジション承認が正本 — Should/Could は置かない。公開契約を完結させる集合として承認済み)
- **Won't(明示)**: Out of Scope 全項目

## 実行境界(タイムボックス)

固定期限なし。**ideation 完了(approval-handoff)で park** し、inception 以降はユーザーの再開承認後(user decision — constraint-register O1)。

## Value Stream(価値の流れ)

欠陥封鎖(D1)→ 検出精度(D3)→ 利用環境の信頼性(D4)→ レビュー品質(D5)→ 機能拡張(D2)→ 拡張基盤(D6)。D7/D8 は各項目に随伴。実装順序の骨格は dependency-first(schema root 先行)+risk-first(検証先行4項目を inception で確定)。
