# amadeus-delivery-agent -- 技術リファレンス

> 言語: [English](delivery-agent.md) | **日本語**

## Identity

| Field | Value |
|-------|-------|
| Name | amadeus-delivery-agent |
| Model Override | sonnet |
| Allowed Claude Code Tools | Read, Edit, Write, Glob, Grep, AskUserQuestion |
| Disallowed Claude Code Tools | Task |

---

## Stage Ownership

### Lead Stages

| Stage | Name | このエージェントの役割 |
|-------|------|----------------------|
| team-formation | Team Formation | 必要なスキルセットを評価し、mob チームを編成し、コミュニケーション規範を定義する |
| approval-handoff | Initiative Approval and Handoff | initiative brief をまとめ、完全性を検証し、ステークホルダー承認のために提示し、フェーズの引き継ぎを実行する |
| delivery-planning | Delivery Planning | Bolt シーケンスを計画し(units-generation ステージの依存 DAG を通じた経済的順序付け)、mob を割り当て、Bolt ごとの Definition of Done と confidence hypothesis を定義する |

### Support Stages

| Stage | Name | このエージェントの貢献 |
|-------|------|-----------------------------|
| scope-definition | Scope Definition and Prioritization | デリバリの実現可能性と利用可能なキャパシティに照らしてスコープを検証する |
| units-generation | Units Generation | ユニットの粒度を計画上のニーズとデリバリのシーケンス要件に整合させる |

---

## Collaboration Patterns

### Receives From

| Source | Artifacts |
|--------|-----------|
| amadeus-product-agent | スコープ、優先度、initiative framing、優先順位付けされたバックログ |
| amadeus-architect-agent | ユニット、複雑度見積もり、依存グラフ |

### Hands Off To

| Target | Artifacts |
|--------|-----------|
| All construction agents | デリバリ計画、mob 割り当て、Bolt シーケンス |
| Orchestrator | フェーズゲート承認のための initiative brief |

---

## Knowledge Sources

### Methodology (Tier 1)

Path: `.claude/knowledge/amadeus-delivery-agent/`

| File | Content |
|------|---------|
| mob-programming-guide.md | mob programming のパターン、ロール(driver、navigator、researcher)、チーム編成 |
| team-topologies.md | チーム編成のパターンとコミュニケーション構造 |
| workflow-planning-guide.md | デリバリ計画: economic-vs-topological なシーケンス、WSJF、walking skeleton、Bolt DoD のパターン |

### Team (Tier 2)

Path: `amadeus/knowledge/amadeus-delivery-agent/` (space レベルの knowledge ディレクトリ。ユーザー管理)

チームがコンテンツを持つときに作成する space レベルのディレクトリ(エンジンは `amadeus/knowledge/` を空で出荷する)。チームの規約、bolt のサイジング方針、組織のキャパシティ制約など、プロジェクト固有のデリバリコンテキストをチームが記入する。

---

## Cross-References

- [Agent Reference Overview](README.ja.md)
- [Agent Guide: amadeus-delivery-agent](../../guide/agents/delivery-agent.ja.md)
- [Stage Documentation](../04-stages/)
- Source: [`dist/claude/.claude/agents/amadeus-delivery-agent.md`](../../../dist/claude/.claude/agents/amadeus-delivery-agent.md)
