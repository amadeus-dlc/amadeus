# Personas — Presence Evidence（260705-presence-evidence）

上流入力: [requirements.md](../requirements-analysis/requirements.md)

## ペルソナ一覧

| ペルソナ | 説明 | 主な関心 |
|---|---|---|
| P1: エンジン開発者（後続） | verifyDocsOnlyEvidence や guard 群を将来変更・レビューする開発者 | evidence 検証の設計境界と防衛線の整理が文書から追えること |
| P2: セキュリティレビュアー（Bugbot 含む） | ガードの抜け道を指摘する立場 | 「機械証明は対象外」が意図的な境界であり、代替防衛線が明示されていること |
| P3: docs 系 Intent の実行者 | declare-docs-only の利用者 | 宣言手順が変わらないこと（mint 規律不変） |

## 優先順位

P1 が主要（文書の直接読者）。P2 は再指摘の抑止、P3 は現状維持の確認者。
