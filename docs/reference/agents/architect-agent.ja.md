# amadeus-architect-agent -- 技術リファレンス

> 言語: [English](architect-agent.md) | **日本語**

## Identity

| Field | Value |
|-------|-------|
| Name | amadeus-architect-agent |
| Model Override | **opus** |
| Allowed Claude Code Tools | Read, Edit, Write, Glob, Grep, AskUserQuestion |
| Disallowed Claude Code Tools | Task |

amadeus-architect-agent は中心的な設計権限を持ち、ライフサイクルの3つのフェーズにわたって最もアーキテクチャ的に複雑な推論タスクを担当します。他の7つの高判断エージェントとともに opus 上で動作します — 3つの sonnet エージェント(delivery、pipeline-deploy、operations)は主にテンプレート化された計画、CI/CD、runbook の出力を生成します。

---

## Stage Ownership

### Lead Stages

| Stage | Name | このエージェントの役割 |
|-------|------|----------------------|
| feasibility | Feasibility and Constraint Analysis | 技術的実現可能性を評価し、統合上の制約を特定し、制約レジスタとリスクアセスメントを作成する |
| application-design | Application Design | システムアーキテクチャを設計する: bounded context、コンポーネントインターフェース、アーキテクチャスタイルの選択、ADR |
| units-generation | Units Generation | application design を実装可能な Units of Work に分解し、境界と依存 DAG を定義する。経済的順序付け(何を最初に出荷するか、その理由)は delivery-planning ステージの決定事項 |
| functional-design | Functional Design | 詳細なドメインモデル、シーケンス図、API 仕様、データモデル、状態遷移を作成する |
| nfr-requirements | NFR Requirements | パフォーマンス、セキュリティ、スケーラビリティ、信頼性について測定可能な目標を伴う非機能要件を列挙する |
| nfr-design | NFR Design | NFR に対する技術的アプローチを設計する: キャッシング、サーキットブレーカー、レジリエンス、セキュリティアーキテクチャ、可観測性 |

### Support Stages

| Stage | Name | このエージェントの貢献 |
|-------|------|-----------------------------|
| intent-capture | Intent Capture and Framing | キャプチャした intent に対して技術的コンテキストと実現可能性の観点を提供する |
| reverse-engineering | Reverse Engineering (Synthesis step) | amadeus-developer-agent からコードスキャン結果を受け取り、一貫したアーキテクチャモデルへ統合する |
| delivery-planning | Delivery Planning | アーキテクチャの依存関係とコンポーネント結合に照らしてビルド順序を検証する |

---

## Collaboration Patterns

### Receives From

| Source | Artifacts |
|--------|-----------|
| amadeus-product-agent | 要件、ユーザーストーリー、intent バックログ |
| amadeus-developer-agent | reverse engineering の統合に用いるコードスキャン結果 |

### Hands Off To

| Target | Artifacts |
|--------|-----------|
| amadeus-developer-agent | Unit of work 仕様、API コントラクト、デザインパターン |
| amadeus-quality-agent | テスト境界、検証用の NFR 目標 |
| amadeus-aws-platform-agent | application design から導出されたインフラ要件 |

---

## Knowledge Sources

### Methodology (Tier 1)

Path: `.claude/knowledge/amadeus-architect-agent/`

| File | Content |
|------|---------|
| adr-template.md | Architecture Decision Record のテンプレートと例 |
| architecture-guide.md | アーキテクチャの方法論と設計プロセス |
| architecture-patterns.md | アーキテクチャスタイルのパターン(microservices、modular monolith、event-driven、serverless) |
| ddd-patterns.md | ドメイン駆動設計のパターン(bounded context、aggregate、entity、value object) |
| nfr-design-guide.md | 非機能要件の設計方法論 |
| nfr-design-patterns.md | NFR 実装のための技術パターン(キャッシング、サーキットブレーカー、レジリエンス) |

### Team (Tier 2)

Path: `amadeus/knowledge/amadeus-architect-agent/` (space レベルの knowledge ディレクトリ。ユーザー管理)

チームがコンテンツを持つときに作成する space レベルのディレクトリ(エンジンは `amadeus/knowledge/` を空で出荷する)。既存のアーキテクチャ図、technology radar、承認済みパターン、制約レジスタなど、プロジェクト固有のアーキテクチャコンテキストをチームが記入する。

---

## Cross-References

- [Agent Reference Overview](README.ja.md)
- [Agent Guide: amadeus-architect-agent](../../guide/agents/architect-agent.ja.md)
- [Stage Documentation](../04-stages/)
- Source: [`dist/claude/.claude/agents/amadeus-architect-agent.md`](../../../dist/claude/.claude/agents/amadeus-architect-agent.md)
