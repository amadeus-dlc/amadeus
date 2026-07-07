# amadeus-developer-agent -- 技術リファレンス

## Identity

| フィールド | 値 |
|-------|-------|
| Name | amadeus-developer-agent |
| Model Override | opus |
| Allowed Claude Code Tools | Read, Edit, Write, Glob, Grep, Bash, AskUserQuestion |
| Disallowed Claude Code Tools | Task |

---

## ステージ所有

### Lead ステージ

| ステージ | 名称 | このエージェントが行うこと |
|-------|------|----------------------|
| reverse-engineering | Reverse Engineering (Code scan step) | 深いコードスキャンを実行し、依存グラフ、API エンドポイント、データベースモデル、技術的負債の指標を抽出する |
| code-generation | Code Generation | アーキテクチャ仕様に基づく units of work をプロダクション品質のコードとして実装する |

### Support ステージ

| ステージ | 名称 | このエージェントが貢献すること |
|-------|------|-----------------------------|
| practices-discovery | Practices Discovery (Inception) | コードパターンのエビデンススキャン: 命名規約、レイヤー分離、エラーハンドリング、ファイル構成を code-style ルールとして返す |
| functional-design | Functional Design | API 契約設計とデータモデル仕様 |
| deployment-execution | Deployment Execution | データベースマイグレーションの実行と検証 |

---

## コラボレーションパターン

### 受け取る元

| ソース | 成果物 |
|--------|-----------|
| amadeus-architect-agent | unit of work 仕様、デザインパターン、API 仕様 |
| amadeus-quality-agent | テスト要件、バグレポート、欠陥仕様 |

### 引き継ぎ先

| ターゲット | 成果物 |
|--------|-----------|
| amadeus-quality-agent | テスト向けの実装済みコード、テストインフラ |
| amadeus-architect-agent | reverse engineering の統合のためのコードスキャン結果 |

---

## 知識ソース

### Methodology (Tier 1)

パス: `.claude/knowledge/amadeus-developer-agent/`

| ファイル | 内容 |
|------|---------|
| api-design-guide.md | API 契約設計(REST、GraphQL、gRPC)の方法論 |
| code-analysis-guide.md | コードベース分析と reverse engineering の手法 |
| code-generation-guide.md | コード生成の方法論と実装パターン |
| code-generation-patterns.md | 言語別のコード生成パターンとテンプレート |
| data-modelling-patterns.md | データモデル設計パターン(リレーショナルおよび NoSQL) |
| re-artifacts.md | reverse engineering の成果物仕様 |

### Team (Tier 2)

パス: `amadeus/knowledge/amadeus-developer-agent/`(space レベルの知識ディレクトリ。ユーザー管理)

チームがコンテンツを持つときに作成する space レベルのディレクトリ(エンジンは `amadeus/knowledge/` を空で出荷する)。コーディング標準、フレームワークの規約、既存の API パターン、マイグレーション戦略といったプロジェクト固有の開発コンテキストをチームが投入する。

---

## クロスリファレンス

- [エージェントリファレンス概要](README.ja.md)
- [エージェントガイド: amadeus-developer-agent](../../guide/agents/developer-agent.ja.md)
- [ステージドキュメント](../04-stages/)
- ソース: [`dist/claude/.claude/agents/amadeus-developer-agent.md`](../../../dist/claude/.claude/agents/amadeus-developer-agent.md)
