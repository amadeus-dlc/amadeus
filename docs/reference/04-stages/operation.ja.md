# Operation フェーズ -- ステージリファレンス (4.1-4.7)

> 言語: [English](operation.md) | **日本語**

## フェーズ概要

Operation フェーズは AI-DLC ライフサイクルにおける5フェーズのうち5番目のフェーズです。Construction で構築・テストされたソフトウェアを受け取り、デプロイ、監視、インシデント対応準備、パフォーマンス検証、継続的最適化を通じて動かします。パイプライン設定、環境プロビジョニング、デプロイ実行、可観測性、インシデント対応、パフォーマンス検証、フィードバック収集にまたがる7つのステージ(4.1から4.7)をカバーします。

7つの Operation ステージはすべて **CONDITIONAL** です — スコープと実行計画に基づいて実行されます。たとえば、mvp、poc、bugfix、chore、refactor スコープは Operation を完全にスキップします。infra と security-patch スコープはサブセット(デプロイと環境のステージ)を実行します。

すべてのステージは **インライン** で実行されます(Operation フェーズにサブエージェントはありません)。すべてのステージは承認ゲート、質問フォーマット、完了メッセージ、状態追跡について `stage-protocol.md` に従います。

---

## ステージ概要テーブル

| ステージ | 名前                     | 実行        | 条件                                                                  | リードエージェント  | サポートエージェント | モード                           |
|-------|--------------------------|-------------|------------------------------------------------------------------------|---------------------|---------------------|----------------------------------|
| 4.1   | Deployment Pipeline      | CONDITIONAL | CD パイプラインの作成または大幅な変更が必要な場合に実行                 | amadeus-pipeline-deploy-agent| (なし)             | inline                           |
| 4.2   | Environment Provisioning | CONDITIONAL | AWS 環境のプロビジョニングまたは検証が必要な場合に実行                  | amadeus-aws-platform-agent  | amadeus-devsecops-agent, amadeus-compliance-agent     | inline                           |
| 4.3   | Deployment Execution     | CONDITIONAL | デプロイパイプラインと環境の準備ができた後に実行                       | amadeus-pipeline-deploy-agent| amadeus-developer-agent    | inline                           |
| 4.4   | Observability Setup      | CONDITIONAL | 監視、ダッシュボード、アラーム、トレーシングの設定が必要な場合に実行    | amadeus-operations-agent    | (なし)              | inline                           |
| 4.5   | Incident Response        | CONDITIONAL | 運用 runbook とインシデント対応手順が必要な場合に実行                   | amadeus-operations-agent | (なし)              | inline                           |
| 4.6   | Performance Validation   | CONDITIONAL | NFR パフォーマンス目標を負荷下で検証する必要がある場合に実行            | amadeus-quality-agent       | (なし)              | inline                           |
| 4.7   | Feedback & Optimization  | CONDITIONAL | 継続的な運用監視と最適化が必要な場合に実行                             | amadeus-operations-agent    | amadeus-aws-platform-agent  | inline                           |

### マルチエージェントステージ

3つの Operation ステージには複数のエージェントが関与します:

- **4.2 Environment Provisioning**: amadeus-aws-platform-agent(リード) + amadeus-devsecops-agent(セキュリティ体制の検証) + amadeus-compliance-agent(データレジデンシー、規制コントロール)
- **4.3 Deployment Execution**: amadeus-pipeline-deploy-agent(リード) + amadeus-developer-agent(データベースマイグレーション)
- **4.7 Feedback & Optimization**: amadeus-operations-agent(リード) + amadeus-aws-platform-agent(コスト最適化、ドリフト検出)

いずれの場合も、コンダクターはまずリードエージェントを呼び出し、次にリードの出力をコンテキストとしてサポートエージェントを呼び出します。コンダクターがすべての委譲を実行し、エージェント同士が互いを呼び出すことはありません。

---

## ステージ 4.1: Deployment Pipeline Configuration

### メタデータ

| プロパティ        | 値                                                                                                |
|-------------------|---------------------------------------------------------------------------------------------------|
| ステージ          | 4.1                                                                                               |
| フェーズ          | Operation                                                                                         |
| 実行              | CONDITIONAL(デプロイパイプラインがすでに存在し十分である場合はスキップ)                           |
| リードエージェント | amadeus-pipeline-deploy-agent                                                                             |
| support_agents    | (なし)                                                                                            |
| 入力              | ステージ3.7からの CI パイプライン設定、ステージ3.4からのインフラ設計                             |

### 目的

CD パイプライン、デプロイ戦略、ロールバック手順、環境昇格ゲートを設定します。

### 出力

| 成果物                            | 説明                                                             |
|-----------------------------------|------------------------------------------------------------------|
| cd-config.md                      | CD パイプライン設定                                        |
| deployment-strategy.md            | デプロイ戦略(ブルー/グリーン、カナリア、ローリング)、昇格ゲート|
| rollback-runbook.md               | ロールバック手順と runbook                                  |
| deployment-pipeline-questions.md  | 回答付きの明確化質問                                |

### 承認ゲート

厳密に2オプション: Approve / Request Changes。

---

## ステージ 4.2: Environment Provisioning

### メタデータ

| プロパティ        | 値                                                                                                |
|-------------------|---------------------------------------------------------------------------------------------------|
| ステージ          | 4.2                                                                                               |
| フェーズ          | Operation                                                                                         |
| 実行              | CONDITIONAL(環境がすでにプロビジョニング済みの場合はスキップ)                                    |
| リードエージェント | amadeus-aws-platform-agent                                                                                |
| support_agents    | amadeus-devsecops-agent(セキュリティ体制の検証)、amadeus-compliance-agent(データレジデンシー、規制コントロール) |
| 入力              | ステージ3.4からのインフラ設計、ステージ4.1からの CD パイプライン設定                             |

### 目的

Construction で作成された Infrastructure as Code を使用して、ターゲットとなる AWS 環境をプロビジョニングし検証します。amadeus-devsecops-agent がセキュリティ体制を検証し、amadeus-compliance-agent がデータレジデンシーと規制コントロールをチェックします。

### 出力

| 成果物                                | 説明                                                       |
|---------------------------------------|------------------------------------------------------------|
| environment-inventory.md              | プロビジョニングされた環境のインベントリ                          |
| validation-report.md                  | インフラ検証レポート、ヘルスチェック            |
| environment-provisioning-questions.md | 回答付きの明確化質問                          |

### 承認ゲート

厳密に2オプション: Approve / Request Changes。

---

## ステージ 4.3: Deployment Execution

### メタデータ

| プロパティ        | 値                                                                                                |
|-------------------|---------------------------------------------------------------------------------------------------|
| ステージ          | 4.3                                                                                               |
| フェーズ          | Operation                                                                                         |
| 実行              | CONDITIONAL(デプロイパイプラインと環境の準備ができた後に実行。すでにデプロイ済みの場合はスキップ) |
| リードエージェント | amadeus-pipeline-deploy-agent                                                                             |
| support_agents    | amadeus-developer-agent(データベースマイグレーション)                                                             |
| 入力              | ステージ4.1からの CD パイプライン設定、ステージ4.2からのプロビジョニング済み環境                       |

### 目的

実際のデプロイを実行します: パイプラインを通じて成果物をプッシュし、スモークテストを実行し、ヘルスチェックを検証し、データベースマイグレーションを実行します。

### 出力

| 成果物                            | 説明                                                        |
|-----------------------------------|--------------------------------------------------------------|
| deployment-log.md                 | デプロイ実行ログ                                     |
| smoke-test-results.md             | デプロイ後のスモークテスト結果                          |
| health-check-report.md            | ヘルスチェック検証レポート                               |
| deployment-execution-questions.md | 回答付きのデプロイ前チェック質問                  |

### 承認ゲート

厳密に2オプション: Approve / Request Changes。

---

## ステージ 4.4: Observability Setup

### メタデータ

| プロパティ        | 値                                                                                                |
|-------------------|---------------------------------------------------------------------------------------------------|
| ステージ          | 4.4                                                                                               |
| フェーズ          | Operation                                                                                         |
| 実行              | CONDITIONAL(可観測性がすでに設定済みの場合はスキップ)                                            |
| リードエージェント | amadeus-operations-agent                                                                                  |
| 入力              | ステージ3.3からの NFR 設計、ステージ3.4からのインフラ設計、デプロイ済みアプリケーション             |

### 目的

監視、ダッシュボード、アラーム、SLO/SLI トラッキング、ログクエリ、分散トレーシング、異常検出を設定します。

### 出力

| 成果物                            | 説明                                                           |
|-----------------------------------|----------------------------------------------------------------|
| dashboards.md                     | CloudWatch ダッシュボード設定                            |
| alarms.md                         | 重大度、SNS ルーティング、エスカレーションを伴うアラーム定義       |
| slo-config.md                     | SLO/SLI トラッキング設定                                |
| log-queries.md                    | CloudWatch Logs Insights の保存済みクエリ                         |
| tracing-config.md                 | X-Ray トレーシング設定                                   |
| anomaly-config.md                 | 異常検出設定                                |
| observability-setup-questions.md  | 回答付きの明確化質問                              |

### 備考

- Operation のどのステージよりも多くの成果物を生成する(コンテンツファイル6つ + 質問)。
- AWS 固有(CloudWatch、X-Ray、SNS)だが、パターンは移植可能。

---

## ステージ 4.5: Incident Response & Runbook Generation

### メタデータ

| プロパティ        | 値                                                                                                |
|-------------------|---------------------------------------------------------------------------------------------------|
| ステージ          | 4.5                                                                                               |
| フェーズ          | Operation                                                                                         |
| 実行              | CONDITIONAL(POC または非本番デプロイではスキップ)                                              |
| リードエージェント | amadeus-operations-agent                                                                                  |
| 入力              | ステージ4.4からの可観測性設定、ステージ3.3からの NFR 設計、ステージ3.4からのインフラ設計 |

### 目的

運用 runbook、インシデント対応計画、エスカレーション手順を生成します。

### 出力

| 成果物                            | 説明                                                           |
|-----------------------------------|----------------------------------------------------------------|
| runbooks.md                       | SSM Automation runbook ライブラリ                                 |
| incident-plan.md                  | インシデント対応計画(AWS Incident Manager 統合)      |
| escalation-matrix.md              | エスカレーションパス、オンコールローテーション、コミュニケーション手順  |
| incident-response-questions.md    | 回答付きの明確化質問                              |

---

## ステージ 4.6: Performance Validation & Load Testing

### メタデータ

| プロパティ        | 値                                                                                                |
|-------------------|---------------------------------------------------------------------------------------------------|
| ステージ          | 4.6                                                                                               |
| フェーズ          | Operation                                                                                         |
| 実行              | CONDITIONAL(POC またはパフォーマンスが重要でないアプリケーションではスキップ)                    |
| リードエージェント | amadeus-quality-agent                                                                                     |
| 入力              | ステージ3.2からの NFR 要件、ステージ3.3からの NFR 設計、ステージ4.4からの可観測性データ    |

### 目的

負荷テストを設計・実行し、デプロイ済みアプリケーションに対して NFR パフォーマンス目標を検証します。

### 出力

| 成果物                                | 説明                                                       |
|---------------------------------------|------------------------------------------------------------|
| load-test-plan.md                     | シナリオ、ツール、設定を伴う負荷テスト計画    |
| test-results.md                       | パフォーマンステスト結果(レイテンシ、スループット、エラーレート) |
| nfr-validation-matrix.md             | NFR 目標 vs. 実測の検証マトリクス                    |
| performance-validation-questions.md   | 回答付きの明確化質問                          |

---

## ステージ 4.7: Continuous Feedback & Optimization

### メタデータ

| プロパティ        | 値                                                                                                |
|-------------------|---------------------------------------------------------------------------------------------------|
| ステージ          | 4.7                                                                                               |
| フェーズ          | Operation                                                                                         |
| 実行              | CONDITIONAL(一回限りのデプロイではスキップ)                                                    |
| リードエージェント | amadeus-operations-agent                                                                                  |
| support_agents    | amadeus-aws-platform-agent(コスト最適化、ドリフト検出)                                           |
| 入力              | すべての Operation フェーズ成果物、本番監視データ                                         |

### 目的

SLO コンプライアンスレビュー、コスト最適化分析、インフラのドリフト検出、運用インサイトの収集。これは AI-DLC ワークフロー全体の **最終ステージ** です。

### 出力

| 成果物                                | 説明                                                       |
|---------------------------------------|------------------------------------------------------------|
| slo-report.md                         | SLO コンプライアンスレポート、エラーバジェットのバーンレート              |
| cost-analysis.md                      | AWS Cost Explorer 分析、最適化の推奨事項   |
| drift-report.md                       | AWS Config ドリフト検出レポート、Trusted Advisor レビュー  |
| feedback-loop.md                      | 運用インサイト、改善提案、次の Ideation サイクルへの入力 |
| feedback-optimization-questions.md    | 回答付きの明確化質問                          |

### 承認ゲート -- 3オプション(固有)

ステージ4.7には **固有の3オプション承認ゲート** があります:

1. **Approve** -- ワークフロー完了。AI-DLC ライフサイクル全体が終了する。
2. **Request Changes** -- 修正フィードバックを提供する。
3. **Start New Ideation Cycle** -- feedback-loop.md のインサイトを新しいステージ1.1へフィードバックする。

これは AI-DLC ライフサイクルの循環的な性質を反映しています。

---

## フェーズ概要

**デプロイステージ (4.1-4.3):**
- 4.1 Deployment Pipeline -- CD パイプライン設定、デプロイ戦略、ロールバック runbook
- 4.2 Environment Provisioning -- セキュリティ体制レビューを伴う AWS 環境のプロビジョニングと検証
- 4.3 Deployment Execution -- 成果物のデプロイ、スモークテスト、ヘルスチェック、データベースマイグレーション

**運用準備ステージ (4.4-4.6):**
- 4.4 Observability Setup -- ダッシュボード、アラーム、SLO、ログクエリ、トレーシング、異常検出
- 4.5 Incident Response -- runbook、インシデント計画、エスカレーションマトリクス
- 4.6 Performance Validation -- 負荷テスト、NFR 目標の検証、キャパシティプランニング

**継続的改善 (4.7):**
- 4.7 Feedback & Optimization -- SLO コンプライアンス、コスト分析、ドリフト検出、フィードバックループ

**スコープの適用性:**
- enterprise / feature / workshop: 全7ステージ
- infra: ステージ4.1-4.4(deployment-pipeline、environment-provisioning、deployment-execution、observability-setup)
- security-patch: ステージ4.1、4.3(deployment-pipeline、deployment-execution)
- mvp / poc / bugfix / chore / refactor: Operation フェーズは完全にスキップ

## 相互参照

- [Orchestrator](../03-orchestrator.ja.md) -- ルーティングロジック、スコープマッピング
- [Stage Protocol](../04-stage-protocol.ja.md) -- 承認ゲート、状態追跡
- [Construction Stages](construction.ja.md) -- 前のフェーズ
