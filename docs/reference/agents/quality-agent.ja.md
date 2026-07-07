# amadeus-quality-agent -- 技術リファレンス

> 言語: [English](quality-agent.md) | **日本語**

## Identity

| フィールド | 値 |
|-------|-------|
| Name | amadeus-quality-agent |
| Model Override | opus |
| Allowed Claude Code Tools | Read, Edit, Write, Glob, Grep, Bash, AskUserQuestion |
| Disallowed Claude Code Tools | Task |

---

## ステージ責務

### Lead ステージ

| ステージ | 名称 | このエージェントの役割 |
|-------|------|----------------------|
| build-and-test | Build and Test | テスト戦略を定義し、テストスイートを生成し、受け入れ基準に対するカバレッジを検証し、品質ゲートを強制する |
| performance-validation | Performance Validation and Load Testing | 負荷テストを設計・実行し、NFR ターゲットを検証し、ボトルネックを特定し、キャパシティプランニングの提言を作成する |

### Support ステージ

| ステージ | 名称 | このエージェントの貢献 |
|-------|------|-----------------------------|
| practices-discovery | Practices Discovery | テスト姿勢(TDD か事後テストか)、カバレッジ下限、CI のブロック/警告挙動をスキャンし、チームのテストプラクティスを表面化する |
| nfr-requirements | NFR Requirements | テスト可能な品質属性シナリオと測定可能な NFR ターゲットを定義する |

---

## コラボレーションパターン

### 受け取る成果物

| ソース | 成果物 |
|--------|-----------|
| amadeus-product-agent | テストケース導出のための受け入れ基準付きユーザーストーリー |
| amadeus-architect-agent | NFR ターゲット、設計のテスト容易性評価、テスト境界 |
| amadeus-developer-agent | テスト対象の実装済みコード |

### 引き渡す成果物

| ターゲット | 成果物 |
|--------|-----------|
| amadeus-pipeline-deploy-agent | CI/CD へのテストスイート統合、品質ゲート定義 |
| amadeus-operations-agent | 本番監視のためのパフォーマンスベースライン |

---

## ナレッジソース

### Methodology (Tier 1)

パス: `.claude/knowledge/amadeus-quality-agent/`

| ファイル | 内容 |
|------|---------|
| nfr-reliability-guide.md | 信頼性テストの方法論とレジリエンス検証 |
| nfr-validation-methods.md | NFR 検証手法(負荷テスト、パフォーマンスプロファイリング) |
| test-strategy-patterns.md | テストピラミッドパターン、テストデータ戦略、品質ゲート設計 |
| testing-guide.md | テストの方法論とテストケース設計の原則 |

### Team (Tier 2)

パス: `amadeus/knowledge/amadeus-quality-agent/`(space レベルのナレッジディレクトリ。ユーザー管理)

チームがコンテンツを持つ際に作成する space レベルのディレクトリ(エンジンは `amadeus/knowledge/` を空で出荷する)。既存のテストフレームワーク、カバレッジターゲット、パフォーマンスベースライン、品質ゲート閾値など、プロジェクト固有の QA コンテキストがチームによって投入される。

---

## クロスリファレンス

- [Agent Reference Overview](README.ja.md)
- [Agent Guide: amadeus-quality-agent](../../guide/agents/quality-agent.ja.md)
- [Stage Documentation](../04-stages/)
- Source: [`dist/claude/.claude/agents/amadeus-quality-agent.md`](../../../dist/claude/.claude/agents/amadeus-quality-agent.md)
