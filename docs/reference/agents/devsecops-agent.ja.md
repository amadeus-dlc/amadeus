# amadeus-devsecops-agent -- 技術リファレンス

## Identity

| フィールド | 値 |
|-------|-------|
| Name | amadeus-devsecops-agent |
| Model Override | opus |
| Allowed Claude Code Tools | Read, Edit, Write, Glob, Grep, Bash, AskUserQuestion |
| Disallowed Claude Code Tools | Task |

---

## ステージ所有

### Lead ステージ

このエージェントは lead ステージを持たない。Inception、Construction、Operation の各フェーズにまたがる複数のステージで、もっぱら support の役割で稼働する。

### Support ステージ

| ステージ | 名称 | このエージェントが貢献すること |
|-------|------|-----------------------------|
| practices-discovery | Practices Discovery | 発見されたチームプラクティスに対する、セキュリティおよび DevSecOps のプラクティス入力(スキャン、シークレット取り扱い、セキュアパイプラインの規約) |
| nfr-requirements | NFR Requirements | セキュリティコントロールの仕様と脅威モデルの統合 |
| infrastructure-design | Infrastructure Design | IAM ポリシーレビュー、セキュリティグループの検証、ネットワークセキュリティ評価 |
| build-and-test | Build and Test | SAST/DAST スキャン設定、依存関係の脆弱性スキャン、IaC セキュリティリンティング |
| environment-provisioning | Environment Provisioning | セキュリティポスチャの検証(Security Hub、Inspector、GuardDuty、暗号化、CloudTrail、VPC Flow Logs) |

---

## コラボレーションパターン

### 受け取る元

| ソース | 成果物 |
|--------|-----------|
| amadeus-compliance-agent | Ideation からの規制要件(制約レジスタ、RAID ログ) |
| amadeus-architect-agent | 脅威モデリングのためのシステム設計、コンポーネント境界 |

### 引き継ぎ先

| ターゲット | 成果物 |
|--------|-----------|
| amadeus-developer-agent | セキュアコーディング要件、脆弱性修正仕様 |
| amadeus-quality-agent | 実行向けのセキュリティテストケース |
| amadeus-pipeline-deploy-agent | CI/CD パイプライン統合向けのセキュリティゲート |

---

## 知識ソース

### Methodology (Tier 1)

パス: `.claude/knowledge/amadeus-devsecops-agent/`

| ファイル | 内容 |
|------|---------|
| devsecops-pipeline-patterns.md | セキュリティパイプライン統合パターン(SAST、DAST、IaC スキャン) |
| nfr-requirements-guide.md | セキュリティに重点を置いた NFR 要件の方法論 |
| security-guide.md | アプリケーションおよびクラウドセキュリティの方法論 |
| threat-modelling-stride.md | STRIDE 脅威モデリングの方法論とテンプレート |

### Team (Tier 2)

パス: `amadeus/knowledge/amadeus-devsecops-agent/`(space レベルの知識ディレクトリ。ユーザー管理)

チームがコンテンツを持つときに作成する space レベルのディレクトリ(エンジンは `amadeus/knowledge/` を空で出荷する)。既存の脅威モデル、セキュリティポリシー、承認済みの暗号化標準、ペネトレーションテストの所見といったプロジェクト固有のセキュリティコンテキストをチームが投入する。

---

## クロスリファレンス

- [エージェントリファレンス概要](README.md)
- [エージェントガイド: amadeus-devsecops-agent](../../guide/agents/devsecops-agent.md)
- [ステージドキュメント](../04-stages/)
- ソース: [`dist/claude/.claude/agents/amadeus-devsecops-agent.md`](../../../dist/claude/.claude/agents/amadeus-devsecops-agent.md)
