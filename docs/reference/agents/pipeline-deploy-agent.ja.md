# amadeus-pipeline-deploy-agent -- 技術リファレンス

## Identity

| フィールド | 値 |
|-------|-------|
| Name | amadeus-pipeline-deploy-agent |
| Model Override | sonnet |
| Allowed Claude Code Tools | Read, Edit, Write, Glob, Grep, Bash, AskUserQuestion |
| Disallowed Claude Code Tools | Task |

---

## ステージ責務

### Lead ステージ

| ステージ | 名称 | このエージェントの役割 |
|-------|------|----------------------|
| practices-discovery | Practices Discovery | 既存のエンジニアリングプラクティスと候補ルールを発見する。承認されると、その内容は team および project のルールレイヤーに昇格される |
| ci-pipeline | CI Pipeline | 品質ゲート、成果物生成、セキュリティスキャンを備えた CI パイプラインを設計・構成する |
| deployment-pipeline | Deployment Pipeline | 昇格ゲート、デプロイ戦略、フィーチャーフラグ統合を備えた CD パイプラインを設計する |
| deployment-execution | Deployment Execution | デプロイを実行し、スモークテストを走らせ、ヘルスメトリクスを監視し、ロールバックを処理する |

### Support ステージ

このエージェントは support の役割を担わない。関与する 4 つのステージはすべて lead ステージである。

---

## コラボレーションパターン

### 受け取る成果物

| ソース | 成果物 |
|--------|-----------|
| amadeus-developer-agent | ビルド可能なソースコード、テストスイート、ビルドスクリプト |
| amadeus-quality-agent | テスト要件、品質ゲート定義 |
| amadeus-aws-platform-agent | 環境エンドポイント、インフラ出力、シークレット |

### 引き渡す成果物

| ターゲット | 成果物 |
|--------|-----------|
| amadeus-operations-agent | 可観測性セットアップと監視のためのデプロイ済みサービス |
| amadeus-quality-agent | パフォーマンス検証のためのデプロイ成果物 |

---

## ナレッジソース

### Methodology (Tier 1)

パス: `.claude/knowledge/amadeus-pipeline-deploy-agent/`

| ファイル | 内容 |
|------|---------|
| cicd-patterns.md | CI/CD パイプラインパターン、品質ゲート、成果物管理 |
| deployment-strategies.md | デプロイ戦略パターン(blue-green、canary、rolling、recreate) |
| branching-strategies.md | 5 つのブランチ戦略(trunk-based、GitHub Flow、GitFlow、release branches、monorepo)と AI-DLC の worktree マッピング。Bolt マージのディスパッチ時に精査される |

### Team (Tier 2)

パス: `amadeus/knowledge/amadeus-pipeline-deploy-agent/`(space レベルのナレッジディレクトリ。ユーザー管理)

チームがコンテンツを持つ際に作成する space レベルのディレクトリ(エンジンは `amadeus/knowledge/` を空で出荷する)。既存のパイプライン設定、デプロイランブック、リリース承認ワークフローなど、プロジェクト固有のデプロイコンテキストがチームによって投入される。

---

## クロスリファレンス

- [Agent Reference Overview](README.md)
- [Agent Guide: amadeus-pipeline-deploy-agent](../../guide/agents/pipeline-deploy-agent.md)
- [Stage Documentation](../04-stages/)
- Source: [`dist/claude/.claude/agents/amadeus-pipeline-deploy-agent.md`](../../../dist/claude/.claude/agents/amadeus-pipeline-deploy-agent.md)
