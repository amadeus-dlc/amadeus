# Escalation Matrix — Issue #1048(正準リスト既決の転写)

上流入力(consumes 全数): `../observability-setup/dashboards.md`(N/A 根拠)、`../observability-setup/alarms.md`(N/A 根拠)、`../../construction/installer-enum-extension/nfr-design/reliability-design.md`(失敗様式)、`../../construction/installer-enum-extension/nfr-design/security-design.md`、`../../construction/installer-enum-extension/infrastructure-design/deployment-architecture.md`(revert 経路)。

## 経路

| 事象 | 一次対応 | エスカレーション先 |
|---|---|---|
| CI 赤・テスト欠陥 | 発見メンバーが Issue 起票(bughunt-file-only: 修正は別割当) | leader(トリアージ・割当) |
| 仕様変更を要する欠陥 | 作業停止+leader 報告 | ユーザー(正準リスト(4)) |
| 修正方式の判断 | 選挙(E-系) | 可否同数のみユーザー(正準リスト(1)) |
| マージ判断 | leader が CI green+READY 実測 | ユーザー承認(通常時)/ auto(就寝時 user decision の範囲内) |
| secret exposure 等の緊急 | 既存緊急手順(deployment:c3 の別手順) | ユーザー即時 |

連絡手段は agmsg(登録名は team.sh で都度実測 — agmsg-recipient-typo)。

## 適用範囲

本 matrix は installer 面の欠陥対応に限る — ワークフロー全体の判断規範は team.md 正準リストが正本(本表はその転写であり独自拡張しない)。
