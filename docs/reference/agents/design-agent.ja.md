# amadeus-design-agent -- 技術リファレンス

## Identity

| フィールド | 値 |
|-------|-------|
| Name | amadeus-design-agent |
| Model Override | opus |
| Allowed Claude Code Tools | Read, Edit, Write, Glob, Grep, WebSearch, AskUserQuestion |
| Disallowed Claude Code Tools | Task |

---

## ステージ所有

### Lead ステージ

| ステージ | 名称 | このエージェントが行うこと |
|-------|------|----------------------|
| rough-mockups | Rough Mockups and Concept Visualization | Ideation フェーズで低忠実度のワイヤーフレーム、コンセプトスケッチ、初期の情報アーキテクチャを作成する |
| refined-mockups | Refined Mockups and UX Design | ワイヤーフレームを中〜高忠実度のモックアップへと発展させ、インタラクション仕様、レスポンシブデザイン、アクセシビリティ注記を付与する |

### Support ステージ

| ステージ | 名称 | このエージェントが貢献すること |
|-------|------|-----------------------------|
| user-stories | User Stories | インタラクションの詳細と UX 受け入れ基準でストーリーを充実させる |
| application-design | Application Design | UI コンポーネント仕様とデザインシステムのマッピングを提供する |

---

## コラボレーションパターン

### 受け取る元

| ソース | 成果物 |
|--------|-----------|
| amadeus-product-agent | ユーザーストーリー、ペルソナ、intent、ユーザージャーニーのコンテキスト |
| amadeus-architect-agent | コンポーネント設計上の制約、UI に影響する技術的制限 |

### 引き継ぎ先

| ターゲット | 成果物 |
|--------|-----------|
| amadeus-developer-agent | 実装向けのインタラクション仕様、コンポーネント仕様 |
| amadeus-quality-agent | テスト向けの UX 受け入れ基準、アクセシビリティ要件 |

---

## 知識ソース

### Methodology (Tier 1)

パス: `.claude/knowledge/amadeus-design-agent/`

| ファイル | 内容 |
|------|---------|
| accessibility-wcag.md | WCAG 2.1 AA ガイドラインと実装パターン |
| component-spec-template.md | コンポーネント仕様(状態、props、振る舞い)を文書化するためのテンプレート |
| interaction-design-patterns.md | ナビゲーション、フォーム、フィードバック、状態遷移のためのインタラクションパターン |
| ux-guide.md | UX デザインの方法論と原則 |
| wireframing-guide.md | 低忠実度・高忠実度のワイヤーフレーミング手法 |

### Team (Tier 2)

パス: `amadeus/knowledge/amadeus-design-agent/`(space レベルの知識ディレクトリ。ユーザー管理)

チームがコンテンツを持つときに作成する space レベルのディレクトリ(エンジンは `amadeus/knowledge/` を空で出荷する)。既存のデザインシステム、ブランドガイドライン、タイポグラフィルール、コンポーネントライブラリといったプロジェクト固有のデザインアセットをチームが投入する。

---

## クロスリファレンス

- [エージェントリファレンス概要](README.md)
- [エージェントガイド: amadeus-design-agent](../../guide/agents/design-agent.md)
- [ステージドキュメント](../04-stages/)
- ソース: [`dist/claude/.claude/agents/amadeus-design-agent.md`](../../../dist/claude/.claude/agents/amadeus-design-agent.md)
