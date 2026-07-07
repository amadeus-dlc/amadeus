# DevSecOps Agent

> 言語: [English](devsecops-agent.md) | **日本語**

> **エージェント詳細解説** · [ユーザーガイド](../00-introduction.ja.md) › [エージェント](../06-agents.ja.md) › [詳細解説](README.ja.md) · 技術リファレンス: [devsecops-agent](../../reference/agents/devsecops-agent.ja.md)

amadeus-devsecops-agent はセキュリティエンジニアです。セキュリティが最後に後付けされるのではなく、ライフサイクルのすべてのフェーズに組み込まれることを保証します。Ideation で特定されたコンプライアンス要件を受け取り、それらをセキュリティコントロール、脅威モデル、スキャンパイプライン、ランタイム監視として実装します。アプリケーションセキュリティ、クラウドセキュリティ、パイプラインセキュリティをカバーします。

amadeus-compliance-agent と同様に、amadeus-devsecops-agent はサポート役割のみで動作します。Inception、Construction、Operation にまたがる 5 つのステージでセキュリティの専門知識を提供します。セキュリティスキャンツールを実行するための Bash アクセスを持ちます。

## リードするステージ

amadeus-devsecops-agent はどのステージもリードしません。

## サポートするステージ

| ステージ | フェーズ | 貢献 |
|-------|-------|-------------|
| 2.2 Practices Discovery | Inception | 確認のためのセキュリティプラクティスとスキャン規約 |
| 3.2 NFR Requirements | Construction | セキュリティコントロール、脅威モデル、STRIDE 分析 |
| 3.4 Infrastructure Design | Construction | IAM ポリシーレビュー、セキュリティグループの検証 |
| 3.6 Build and Test | Construction | SAST/DAST スキャン、依存関係の脆弱性、IaC リンティング |
| 4.2 Environment Provisioning | Operation | セキュリティ態勢の検証(Security Hub、Inspector、GuardDuty) |

## 期待できること

amadeus-devsecops-agent が(サポートエージェントとして)アクティブなとき、攻撃対象領域、信頼境界、セキュリティコントロールに焦点を当てます。セキュリティのアンチパターンについて設計をレビューし、機密データフローが暗号化されアクセス制御されていることを検証し、サードパーティの依存関係を既知の脆弱性について評価します。

## 協働の仕方

amadeus-devsecops-agent は amadeus-compliance-agent から規制要件を、amadeus-architect-agent からシステム設計を受け取ります。セキュアコーディングのプラクティスについては amadeus-developer-agent と、インフラのハードニングについては amadeus-aws-platform-agent と、セキュリティテスト要件については amadeus-quality-agent と協働します。そのセキュリティゲートとスキャン構成は amadeus-pipeline-deploy-agent へ引き渡されます。

## 主要な原則

- 多層防御 — 単一のセキュリティコントロールが単一障害点であってはならない
- あらゆる場所で最小権限 — すべてのユーザー、サービス、プロセスに最小限の権限を
- 侵害を前提とする — 内部コンポーネントは互いに認証・認可し合わなければならない
- デフォルト構成はセキュアでなければならない
- すべての入力は検証されるまで敵対的であり、すべての外部データはサニタイズされるまで汚染されている
- セキュリティは要件であり、後回しにできる機能ではない
