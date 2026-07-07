# amadeus-compliance-agent -- 技術リファレンス

## Identity

| Field | Value |
|-------|-------|
| Name | amadeus-compliance-agent |
| Model Override | opus |
| Allowed Claude Code Tools | Read, Edit, Write, Glob, Grep, WebSearch, AskUserQuestion |
| Disallowed Claude Code Tools | Task |

---

## Stage Ownership

### Lead Stages

このエージェントに lead ステージはありません。ライフサイクル全体を通じて、支援・助言の立場でのみ活動します。

### Support Stages

| Stage | Name | このエージェントの貢献 |
|-------|------|-----------------------------|
| feasibility | Feasibility and Constraint Analysis | 規制上の制約の特定、コンプライアンス実現可能性の評価、RAID ログの初期化 |
| nfr-requirements | NFR Requirements | コンプライアンス起点の非機能要件とコントロール仕様 |
| infrastructure-design | Infrastructure Design | データレジデンシーの検証、暗号化要件、IAM 監査 |
| environment-provisioning | Environment Provisioning | プロビジョニング済み環境のコンプライアンス態勢の検証 |

---

## Collaboration Patterns

### Receives From

| Source | Artifacts |
|--------|-----------|
| amadeus-architect-agent | コンプライアンスレビュー用のシステム設計、データフロー図 |
| amadeus-devsecops-agent | コンプライアンスマッピング用のセキュリティコントロール、暗号化仕様 |

### Hands Off To

| Target | Artifacts |
|--------|-----------|
| amadeus-architect-agent | 設計へ組み込むためのコンプライアンス要件 |
| amadeus-devsecops-agent | 規制上の要請から導出されたセキュリティコントロール仕様 |
| Orchestrator | コンプライアンスリスクのエスカレーション、RAID ログの更新 |

### Collaborates With (peer)

| Peer | Shared concern |
|------|----------------|
| amadeus-aws-platform-agent | データレジデンシー、保存時暗号化、IAM 監査 |

---

## Knowledge Sources

### Methodology (Tier 1)

Path: `.claude/knowledge/amadeus-compliance-agent/`

| File | Content |
|------|---------|
| regulatory-frameworks.md | 主要な規制フレームワーク(PCI-DSS、HIPAA、SOC 2、GDPR)のリファレンス |

### Team (Tier 2)

Path: `amadeus/knowledge/amadeus-compliance-agent/` (space レベルの knowledge ディレクトリ。ユーザー管理)

チームがコンテンツを持つときに作成する space レベルのディレクトリ(エンジンは `amadeus/knowledge/` を空で出荷する)。既存のコンプライアンスマトリクス、監査所見、データ分類スキーム、規制解釈など、プロジェクト固有のコンプライアンスコンテキストをチームが記入する。

---

## Cross-References

- [Agent Reference Overview](README.md)
- [Agent Guide: amadeus-compliance-agent](../../guide/agents/compliance-agent.md)
- [Stage Documentation](../04-stages/)
- Source: [`dist/claude/.claude/agents/amadeus-compliance-agent.md`](../../../dist/claude/.claude/agents/amadeus-compliance-agent.md)
