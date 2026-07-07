# Deployment Pipeline — Clarifying Questions

## Q1: デプロイ戦略（blue/green、canary、rolling）は？

**Answer**: いずれも該当しない。`@amadeus-dlc/setup` は **npm パッケージ** のため、**manual gated release** 戦略を採用する。

- CI（`ci-config.md`）: PR/push で検証のみ、publish なし
- CD（`release-setup.yml`）: `workflow_dispatch` + `dry_run` デフォルト + protected `npm-publish` environment
- ランタイムトラフィック切替（blue/green 等）は存在しない

## Q2: 環境プロモーション（dev → staging → prod）は？

**Answer**:

| 段階 | 環境 | トリガー |
|------|------|---------|
| 1 | local developer | maintainer scripts / dry-run 相当 |
| 2 | GitHub Actions dry-run | `workflow_dispatch` + `dry_run:true` |
| 3 | GitHub Actions protected publish | `dry_run:false` + `confirm_package` + environment approval |

staging 専用 registry は使用しない。npm dist-tag（`latest` / prerelease tag）が公開チャネル境界。

## Q3: 本番デプロイの承認ワークフローは？

**Answer**（`quality-gates.md` / U8 `cicd-pipeline.md` 整合）:

1. maintainer が GitHub Actions UI から `Release Setup Package` を dispatch
2. `dry_run:true` で preflight 全 pass を確認
3. `dry_run:false` + `confirm_package=@amadeus-dlc/setup` を設定
4. GitHub Environment `npm-publish` の required reviewers 承認
5. 単一 `npm publish --provenance` 実行

## Q4: ロールバック手順は？

**Answer**: `rollback-runbook.md` 参照。npm unpublish 制限を考慮し、**deprecate + patch republish** を第一選択。

## Q5: Feature flag 戦略（Evidently / AppConfig）は？

**Answer**: N/A。CLI インストーラに runtime feature flag 基盤はない。バージョン固定インストール（SemVer / dist-tag）が変更制御。

## Upstream References

- `ci-config.md`: CI job 構成、release workflow 概要
- `quality-gates.md`: merge blocking / release preflight gate 一覧
- U8 `deployment-architecture.md`: workflow topology、environment 定義
- U8 `cicd-pipeline.md`: release-setup job 契約、publish command
