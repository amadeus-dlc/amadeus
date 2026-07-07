# amadeus-product-agent -- 技術リファレンス

## Identity

| フィールド | 値 |
|-------|-------|
| Name | amadeus-product-agent |
| Model Override | opus |
| Allowed Claude Code Tools | Read, Edit, Write, Glob, Grep, WebSearch, AskUserQuestion |
| Disallowed Claude Code Tools | Task |

---

## ステージ責務

### Lead ステージ

| ステージ | 名称 | このエージェントの役割 |
|-------|------|----------------------|
| intent-capture | Intent Capture and Framing | ステークホルダーの入力からビジネス意図、問題定義、成功指標、初期制約を捕捉する |
| market-research | Market Research and Competitive Analysis | 競合環境、市場トレンド、build-vs-buy のトレードオフ、差別化機会を調査する |
| scope-definition | Scope Definition and Prioritization | スコープ境界(内/外)を定義し、優先順位付けフレームワークを適用し、Intent Backlog を作成する |
| requirements-analysis | Requirements Analysis | Ideation の成果物から要件を構造化・形式化し、トレース可能でテスト可能な仕様にする |
| user-stories | User Stories | 要件を、ペルソナ・受け入れ基準・依存関係マッピングを備えた INVEST 準拠のユーザーストーリーへと変換する |

### Support ステージ

| ステージ | 名称 | このエージェントの貢献 |
|-------|------|-----------------------------|
| rough-mockups | Rough Mockups and Concept Visualization | 捕捉した意図とユーザーニーズに照らしてワイヤーフレームを検証する |
| approval-handoff | Initiative Approval and Handoff | フェーズ遷移前にイニシアチブブリーフの完全性を検証する |
| refined-mockups | Refined Mockups and UX Design | ユーザーストーリーと受け入れ基準に照らして精緻化されたデザインを検証する |

---

## コラボレーションパターン

### 受け取る成果物

| ソース | 成果物 |
|--------|-----------|
| User/stakeholder input | 生のビジネスニーズ、ドメイン知識、プロジェクト記述 |
| Existing documentation | 過去の成果物、レガシーシステムのドキュメント |
| amadeus-operations-agent | 次の Ideation サイクルに向けた本番からの運用フィードバック(ライフサイクルループを閉じる) |

### 引き渡す成果物

| ターゲット | 成果物 |
|--------|-----------|
| amadeus-architect-agent | システム設計と分解のための検証済み要件 |
| amadeus-developer-agent | コード生成のためのストーリー仕様 |
| amadeus-quality-agent | テストケース設計のための受け入れ基準 |
| amadeus-delivery-agent | デリバリー計画のための優先順位付けされたバックログ |

---

## ナレッジソース

### Methodology (Tier 1)

パス: `.claude/knowledge/amadeus-product-agent/`

| ファイル | 内容 |
|------|---------|
| functional-design-guide.md | 機能設計の方法論 |
| market-research-methods.md | 市場調査の手法とテンプレート |
| prioritization-frameworks.md | MoSCoW、WSJF、RICE、Kano の各フレームワーク |
| product-guide.md | プロダクトマネジメントの方法論 |
| requirements-elicitation.md | 要件収集の手法 |
| requirements-guide.md | 要件分析の方法論 |
| user-story-patterns.md | INVEST 基準、ストーリーパターン、受け入れ基準テンプレート |

### Team (Tier 2)

パス: `amadeus/knowledge/amadeus-product-agent/`(space レベルのナレッジディレクトリ。ユーザー管理)

チームがコンテンツを持つ際に作成する space レベルのディレクトリ(エンジンは `amadeus/knowledge/` を空で出荷する)。既存のペルソナ、市場調査、ドメイン用語集、ステークホルダーとのコミュニケーション設定など、プロジェクト固有のプロダクト知識がチームによって投入される。

---

## クロスリファレンス

- [Agent Reference Overview](README.md)
- [Agent Guide: amadeus-product-agent](../../guide/agents/product-agent.md)
- [Stage Documentation](../04-stages/)
- Source: [`dist/claude/.claude/agents/amadeus-product-agent.md`](../../../dist/claude/.claude/agents/amadeus-product-agent.md)
