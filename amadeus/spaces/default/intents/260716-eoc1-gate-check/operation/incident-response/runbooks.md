# Runbooks — eoc1-gate-check

## 上流入力(consumes 全数)

`../deployment-pipeline/rollback-runbook.md`(revert 手順)、`../observability-setup/observability-setup-questions.md`(観測 = 監査行)、`../../construction/eoc1-gate-guard/nfr-design/security-design.md`、`../observability-setup/dashboards.md`(N/A 根拠)、`../observability-setup/alarms.md`(N/A 根拠)、`../../construction/eoc1-gate-guard/infrastructure-design/deployment-architecture.md`(revert 前提)。

## Runbook(incident-response:c3 — repo-native 記録の再利用)

**症状: gate-start が偽陽性で拒否される** — (1) エラー文言の是正手順どおり questions へ証跡記載 or [Answer] 差し戻し → 再実行(冪等・state 非破壊) (2) ガード自体の欠陥なら Issue 起票(bug/P0-P3+S)→ revert(rollback-runbook)。Detect→Recover→Verify→Record は PR/Issue/監査シャードの既存 repo-native 記録を正本とし、新規 paging 基盤は作らない(c3)。
