# amadeus-aws-platform-agent -- 技術リファレンス

## Identity

| Field | Value |
|-------|-------|
| Name | amadeus-aws-platform-agent |
| Model Override | opus |
| Allowed Claude Code Tools | Read, Edit, Write, Glob, Grep, Bash, AskUserQuestion |
| Disallowed Claude Code Tools | Task |

---

## Stage Ownership

### Lead Stages

| Stage | Name | このエージェントの役割 |
|-------|------|----------------------|
| infrastructure-design | Infrastructure Design | アプリケーションアーキテクチャを AWS サービスの選定、CDK/CloudFormation テンプレート、VPC 設計、IAM ポリシー、コスト見積もりへ落とし込む |
| environment-provisioning | Environment Provisioning | IaC 定義から dev/staging/production 環境をプロビジョニングし、ドリフト検出と環境の同一性を確保する |

### Support Stages

| Stage | Name | このエージェントの貢献 |
|-------|------|-----------------------------|
| feasibility | Feasibility and Constraint Analysis | AWS サービスの提供状況、リージョン制約、クラウドプラットフォームの制限を評価する |
| application-design | Application Design | クラウドネイティブなパターン、マネージドサービスの統合、serverless の選択肢について助言する |
| nfr-design | NFR Design | NFR をインフラ仕様、オートスケーリングポリシー、レジリエンス設定へ落とし込む |
| feedback-optimization | Feedback and Optimization | 本番メトリクスに基づいてコスト最適化の機会とインフラチューニングを特定する |

---

## Collaboration Patterns

### Receives From

| Source | Artifacts |
|--------|-----------|
| amadeus-architect-agent | アプリケーショントポロジー、コンポーネントインベントリ、インフラ要件 |
| amadeus-devsecops-agent | セキュリティ要件、コンプライアンスコントロール、暗号化仕様 |

### Hands Off To

| Target | Artifacts |
|--------|-----------|
| amadeus-pipeline-deploy-agent | デプロイターゲット用の環境エンドポイント、インフラ出力 |
| amadeus-operations-agent | 可観測性のセットアップと監視のためのプロビジョニング済みインフラ |

---

## Knowledge Sources

### Methodology (Tier 1)

Path: `.claude/knowledge/amadeus-aws-platform-agent/`

| File | Content |
|------|---------|
| cdk-best-practices.md | AWS CDK の construct パターン、スタック構成、テスト |
| cost-optimization-patterns.md | FinOps パターン、right-sizing、reserved instances、savings plans |
| infrastructure-guide.md | インフラ設計の方法論と環境プロビジョニング |
| well-architected-framework.md | AWS Well-Architected Framework の6つの柱のリファレンス |

### Team (Tier 2)

Path: `amadeus/knowledge/amadeus-aws-platform-agent/` (space レベルの knowledge ディレクトリ。ユーザー管理)

チームがコンテンツを持つときに作成する space レベルのディレクトリ(エンジンは `amadeus/knowledge/` を空で出荷する)。既存の VPC 設計、AWS アカウント構成、承認済みサービスカタログ、コストベースラインなど、プロジェクト固有のインフラコンテキストをチームが記入する。

---

## Cross-References

- [Agent Reference Overview](README.md)
- [Agent Guide: amadeus-aws-platform-agent](../../guide/agents/aws-platform-agent.md)
- [Stage Documentation](../04-stages/)
- Source: [`dist/claude/.claude/agents/amadeus-aws-platform-agent.md`](../../../dist/claude/.claude/agents/amadeus-aws-platform-agent.md)
