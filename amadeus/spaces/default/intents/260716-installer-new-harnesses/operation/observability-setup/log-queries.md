# Log Queries — Issue #1048(既存参照の文書化)

上流入力(consumes 全数): `../../construction/installer-enum-extension/nfr-design/performance-design.md`、`../../construction/installer-enum-extension/nfr-design/security-design.md`、`../../construction/installer-enum-extension/nfr-design/reliability-design.md`、`../../construction/installer-enum-extension/infrastructure-design/monitoring-design.md`、`../../construction/installer-enum-extension/infrastructure-design/infrastructure-services.md`。

## 実在するログ面と参照方法

| ログ | 参照 |
|---|---|
| CI 実行ログ | GitHub Actions の run ログ(PR #1109 で発火実績)— job 別に typecheck/lint/tests/coverage を追跡 |
| ワークフロー監査 | `<record>/audit/*.md`(append-only シャード)— SENSOR_*/GATE_*/DELEGATED_* を grep で照会 |
| installer 実行出力 | CLI stdout(ACTION_LABELS 経路)— fixture テストで assert 済み、永続ログなし |

## クエリ例

`grep -h 'SENSOR_FAILED' <record>/audit/*.md`(センサー赤の全数照会)/ `gh run list --workflow ci.yml`(CI 履歴)。
