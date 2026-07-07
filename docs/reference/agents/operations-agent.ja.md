# amadeus-operations-agent -- 技術リファレンス

## Identity

| フィールド | 値 |
|-------|-------|
| Name | amadeus-operations-agent |
| Model Override | sonnet |
| Allowed Claude Code Tools | Read, Edit, Write, Glob, Grep, Bash, AskUserQuestion |
| Disallowed Claude Code Tools | Task |

---

## ステージ責務

### Lead ステージ

| ステージ | 名称 | このエージェントの役割 |
|-------|------|----------------------|
| observability-setup | Observability Setup | CloudWatch ダッシュボード、アラーム、X-Ray トレーシング、構造化ロギング、カスタムメトリクスを構成する |
| incident-response | Incident Response | SSM ランブックを作成し、重大度レベルを定義し、オンコール体制を確立し、カオス実験を設計する |
| feedback-optimization | Feedback and Optimization | 本番メトリクスを分析し、インサイトを Ideation にフィードバックし、インフラおよびアーキテクチャの改善を提言する |

### Support ステージ

なし。ステージグラフは performance-validation (4.6) に対して `support_agents: []` を記録している — このステージは amadeus-quality-agent がリードする。このエージェントが observability-setup (4.4) で立ち上げる運用テレメトリとベースラインは、非公式にはパフォーマンス検証に供給されるが、operations は 4.6 の正式な support エージェントではない。

---

## コラボレーションパターン

### 受け取る成果物

| ソース | 成果物 |
|--------|-----------|
| amadeus-aws-platform-agent | プロビジョニング済みインフラ、CloudWatch 名前空間、スケーリングポリシー |
| amadeus-pipeline-deploy-agent | デプロイ済みサービス、デプロイメタデータ |

### 引き渡す成果物

| ターゲット | 成果物 |
|--------|-----------|
| amadeus-product-agent | 次の Ideation サイクルへの運用フィードバック(ライフサイクルループを閉じる) |
| amadeus-architect-agent | 本番観測に基づくアーキテクチャ改善提言 |
| Orchestrator | イテレーション計画のためのフィードバックレポート |

---

## ナレッジソース

### Methodology (Tier 1)

パス: `.claude/knowledge/amadeus-operations-agent/`

| ファイル | 内容 |
|------|---------|
| incident-response-guide.md | インシデントレスポンスの方法論、重大度レベル、ポストモーテムテンプレート |
| nfr-performance-guide.md | パフォーマンス監視・最適化の方法論 |
| observability-patterns.md | 可観測性パターン(ダッシュボード、アラーム、トレーシング、ロギング) |
| slo-sli-patterns.md | SLO/SLI 定義パターン、エラーバジェットポリシー |

### Team (Tier 2)

パス: `amadeus/knowledge/amadeus-operations-agent/`(space レベルのナレッジディレクトリ。ユーザー管理)

チームがコンテンツを持つ際に作成する space レベルのディレクトリ(エンジンは `amadeus/knowledge/` を空で出荷する)。既存のランブック、オンコールスケジュール、SLO ターゲット、監視ダッシュボードなど、プロジェクト固有の運用コンテキストがチームによって投入される。

---

## クロスリファレンス

- [Agent Reference Overview](README.ja.md)
- [Agent Guide: amadeus-operations-agent](../../guide/agents/operations-agent.ja.md)
- [Stage Documentation](../04-stages/)
- Source: [`dist/claude/.claude/agents/amadeus-operations-agent.md`](../../../dist/claude/.claude/agents/amadeus-operations-agent.md)
