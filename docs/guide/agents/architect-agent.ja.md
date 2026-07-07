# Architect Agent

> **エージェント詳細解説** · [ユーザーガイド](../00-introduction.md) › [エージェント](../06-agents.md) › [詳細解説](README.md) · 技術リファレンス: [architect-agent](../../reference/agents/architect-agent.md)

amadeus-architect-agent はソリューションアーキテクトです。要件を堅牢なシステムアーキテクチャへ翻訳し、Architecture Decision Records(ADR)を作成し、ドメインモデルを設計し、プロジェクトを実装可能な作業単位へ分解します。パターンとトレードオフの観点で思考し、開発者が直接実装できる設計を生み出します。

amadeus-architect-agent は、ライフサイクル内で単一エージェントとして最も多くのステージ — 合計 6 つ — をリードし、Ideation、Inception、Construction にまたがります。主たる設計権限であり、他の 7 つの高い判断力を要するエージェントとともに Opus モデルで動作します。delivery、pipeline-deploy、operations の 3 つだけが Sonnet で動作しますが、それはこれらの出力が主にテンプレートベースだからです。

## リードするステージ

| ステージ | フェーズ | 説明 |
|-------|-------|-------------|
| 1.3 Feasibility & Constraints | Ideation | 技術的実現可能性の評価と制約分析 |
| 2.6 Application Design | Inception | コンポーネント設計、API 契約、ADR |
| 2.7 Units Generation | Inception | 設計を実装可能な作業単位へ分解 |
| 3.1 Functional Design | Construction | 詳細なドメインモデルとビジネスロジック(ユニット単位) |
| 3.2 NFR Requirements | Construction | 測定可能な目標値を伴う非機能要件(ユニット単位) |
| 3.3 NFR Design | Construction | キャッシング、レジリエンス、セキュリティの技術的アプローチ(ユニット単位) |

さらに、ステージ 2.1(Reverse Engineering)の統合ステップもリードします。ここでは amadeus-developer-agent からコードスキャン結果を受け取り、9 つのアーキテクチャ成果物を生成します。

## サポートするステージ

| ステージ | フェーズ | 貢献 |
|-------|-------|-------------|
| 1.1 Intent Capture | Ideation | 技術的コンテキストの提供 |
| 2.1 Reverse Engineering(統合ステップ) | Inception | コードスキャン結果を一貫したアーキテクチャモデルへ統合 |
| 2.8 Delivery Planning | Inception | アーキテクチャの依存関係に照らしてビルド順序を検証 |

## 期待できること

amadeus-architect-agent がアクティブなとき、境界、パターン、トレードオフに焦点を当てます。既存システムの制約、技術の選好、スケーラビリティ要件、運用上の懸念について問いかけます。明示的な意思決定の根拠を伴う構造化された設計ドキュメント、markdown で記述されたコンポーネント図、そして重要な選択ごとの ADR を生成します。

## 協働の仕方

amadeus-architect-agent は amadeus-product-agent から要件を、amadeus-developer-agent からコードスキャン結果を受け取ります。AWS サービスマッピングでは amadeus-aws-platform-agent と、セキュア設計では amadeus-devsecops-agent と、規制上の制約では amadeus-compliance-agent と協働します。その出力(ユニット仕様、API 契約、NFR 目標値)は amadeus-developer-agent、amadeus-quality-agent、amadeus-aws-platform-agent によって消費されます。

## 主要な原則

- すべての設計成果物は、明示的な根拠を伴う意思決定まで遡れなければならない
- コンポーネント境界を正しく設定することは、内部の詳細よりも重要である
- コンポーネント間の依存関係を積極的に最小化する
- 再利用ではなく変更のために設計する — 変更容易性を最適化する
- 隠れた前提を明示化する — データフロー、所有権、障害モードを表面化させる
- 可逆的な意思決定を優先し、不可逆的なものは追加の精査のためにフラグを立てる
