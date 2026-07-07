# Compliance Agent

> 言語: [English](compliance-agent.md) | **日本語**

> **エージェント詳細解説** · [ユーザーガイド](../00-introduction.ja.md) › [エージェント](../06-agents.ja.md) › [詳細解説](README.ja.md) · 技術リファレンス: [compliance-agent](../../reference/agents/compliance-agent.ja.md)

amadeus-compliance-agent は GRC(Governance, Risk, and Compliance)アナリストです。ライフサイクルのすべてのステージが、適用される規制上の義務と組織のコンプライアンスポリシーを考慮していることを保証します。早期に規制要件をスキャンし、それらを技術的コントロールへマッピングし、コンプライアンスリスクの RAID ログを維持し、設計が監査上の期待を満たすことを検証します。

amadeus-compliance-agent はサポート役割のみで動作します — どのステージもリードしません。代わりに、Ideation、Construction、Operation にまたがる 4 つのステージでコンプライアンスの専門知識を提供します。

## リードするステージ

amadeus-compliance-agent はどのステージもリードしません。

## サポートするステージ

| ステージ | フェーズ | 貢献 |
|-------|-------|-------------|
| 1.3 Feasibility & Constraints | Ideation | 規制上の制約の特定、コンプライアンスの実現可能性、RAID ログの初期化 |
| 3.2 NFR Requirements | Construction | 規制上の NFR マッピング、コンプライアンスコントロール要件、データ分類 |
| 3.4 Infrastructure Design | Construction | データレジデンシーの検証、暗号化要件、IAM コンプライアンスコントロール |
| 4.2 Environment Provisioning | Operation | コンプライアンスコントロールの検証、監査ロギング、規制上の構成チェック |

## 期待できること

amadeus-compliance-agent が(リードエージェントと並んでサポートエージェントとして)アクティブなとき、規制フレームワーク、データ分類、コントロールマッピングに焦点を当てます。適用される規制(GDPR、HIPAA、PCI-DSS、SOC 2)、データの機密度レベル、既存のコンプライアンスポリシーについて問いかけます。コンプライアンスコントロールマトリクスを生成し、是正が必要なギャップにフラグを立てます。

## 協働の仕方

amadeus-compliance-agent は amadeus-architect-agent からシステム設計とデータフロー情報を、amadeus-devsecops-agent からセキュリティコントロールの詳細を受け取ります。設計への組み込みのために amadeus-architect-agent へコンプライアンス要件と制約を返し、実装のために amadeus-devsecops-agent へセキュリティコントロール仕様を提供します。

## 主要な原則

- コンプライアンスは制約であり、後付けではない — リリース時に発見されるギャップはプロジェクトの失敗である
- データ分類がすべてのコントロールに関する意思決定を駆動する
- コンプライアンスの主張には監査可能な証拠が必要である — 証明のないコントロールは存在しない
- 最も機密度の高いデータと最もペナルティの重い規制に是正を集中させる
- 規制リテラシーはチームスポーツである — amadeus-compliance-agent が教育し、チームが実行する
