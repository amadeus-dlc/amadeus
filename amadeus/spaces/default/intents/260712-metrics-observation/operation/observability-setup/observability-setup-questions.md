# Observability Setup Questions

## 確定回答

- Golden signal: GitHub Actions `metrics-snapshot` jobの成功/失敗とrepository内`metrics/*.json`。
- SLO/SLI: runtime service不存在のためavailability/latency SLOはN/A。
- Dashboard: 外部dashboardはN/A。GitHub Actions run historyとversion-controlled snapshotを使用。
- Log/tracing: runtime log/X-Ray対象不存在のためN/A。

## 上流根拠

`performance-design.md`、`security-design.md`、`reliability-design.md`、`monitoring-design.md`、`infrastructure-services.md`は、実在境界をGitHub Actionsとrepository snapshotに限定する。

## 制約

CloudWatch、SNS、X-Ray等の作成・認証・変更は行わない。landing後main runの実測だけをPENDINGとする。
