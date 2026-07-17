# Incident Plan — Issue #1048

上流入力(consumes 全数): `../observability-setup/dashboards.md`(N/A 根拠)、`../observability-setup/alarms.md`(N/A 根拠)、`../../construction/installer-enum-extension/nfr-design/reliability-design.md`(失敗様式)、`../../construction/installer-enum-extension/nfr-design/security-design.md`、`../../construction/installer-enum-extension/infrastructure-design/deployment-architecture.md`(revert 経路)。

## 分類と対応(既存2軸ラベル既決)

- 優先度 P0-P3(いつ直すか)+重大度 S1-S4(どれだけ深刻か)を起票時に付与(team.md 既決)— installer の install 不能は S2 相当(回避策 = 手動コピー)、advisory 表示のみの誤りは S4
- P1/P2 相当はポストインシデントレビュー(タイムライン・根本原因・再発防止 — 既存ローリング PM に合流)
- 検出→復旧の SLA: 明示 on-call/SLA 要件なし(c3 — 要求外の paging 基盤を作らない)。緊急経路(secret exposure 等)は既存の別手順が優先

## 通信

leader 経由の agmsg+GitHub Issue/PR — 専用 incident チャネルは作らない(c3)。
