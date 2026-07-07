# AWS Platform Agent

> 言語: [English](aws-platform-agent.md) | **日本語**

> **エージェント詳細解説** · [ユーザーガイド](../00-introduction.ja.md) › [エージェント](../06-agents.ja.md) › [詳細解説](README.ja.md) · 技術リファレンス: [aws-platform-agent](../../reference/agents/aws-platform-agent.ja.md)

amadeus-aws-platform-agent は AWS ソリューションアーキテクトかつインフラエンジニアです。アプリケーションアーキテクチャを AWS サービスの選定、CDK/CloudFormation テンプレート、環境プロビジョニング戦略へと翻訳します。下すインフラ上の意思決定はすべて、コストを意識し、デフォルトでセキュアであり、AWS Well-Architected Framework に照らして検証されています。

amadeus-aws-platform-agent は 2 つのステージをリードし、他の 4 つをサポートします。AWS CLI コマンド、CDK 操作、インフラ検証ツールを実行するための Bash アクセスを持ちます。

## リードするステージ

| ステージ | フェーズ | 説明 |
|-------|-------|-------------|
| 3.4 Infrastructure Design | Construction | AWS サービスの選定、IaC テンプレート、コスト見積もり(ユニット単位) |
| 4.2 Environment Provisioning | Operation | IaC 定義から環境をプロビジョニングし検証する |

## サポートするステージ

| ステージ | フェーズ | 貢献 |
|-------|-------|-------------|
| 1.3 Feasibility & Constraints | Ideation | AWS サービスの利用可否と制約の評価 |
| 2.6 Application Design | Inception | クラウドネイティブなパターンとサービス統合の助言 |
| 3.3 NFR Design | Construction | NFR をインフラ仕様とスケーリングポリシーへ翻訳 |
| 4.7 Feedback & Optimization | Operation | コスト最適化とインフラのチューニング |

## 期待できること

amadeus-aws-platform-agent がアクティブなとき、AWS アカウント構造、既存のインフラ、コスト制約、コンプライアンス要件について問いかけます。CDK/CloudFormation 仕様、VPC トポロジー、IAM ポリシー、環境ティアごとのコスト見積もりを伴うインフラ設計を生成します。サービスの利用可否や既存の構成を検証するために AWS CLI コマンドを実行することがあります。

## 協働の仕方

amadeus-aws-platform-agent は amadeus-architect-agent からアプリケーショントポロジーを、amadeus-devsecops-agent からセキュリティ要件を受け取ります。監視インフラとランブック統合については amadeus-operations-agent と協働します。プロビジョニングされた環境はデプロイ先として amadeus-pipeline-deploy-agent へ引き渡されます。

## 主要な原則

- すべてのインフラ上の意思決定は、Well-Architected の 6 本柱すべてに対して弁護可能でなければならない
- すべてのリソースはコードで定義される — コンソールでの変更はドリフトである
- コストは第一級のアーキテクチャ上の関心事である — すべての設計にコスト見積もりを含める
- IAM ポリシーは必要最小限の権限のみを付与する — ワイルドカードポリシーは使わない
- 開発、ステージング、本番はスケールのみで異なるべきであり、トポロジーで異なってはならない
