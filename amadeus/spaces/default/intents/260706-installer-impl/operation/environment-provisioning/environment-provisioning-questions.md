# Environment Provisioning — Clarifying Questions

## Q1: Infra Design どおり全環境がプロビジョニング済みか？

**Answer**: AWS VPC/ECS 等は **本 intent スコープ外**。U8 `deployment-architecture.md` で定義された 3 環境は以下:

| 環境 | 状態 | 根拠 |
|------|------|------|
| local developer | 利用可能 | maintainer scripts + Bun runtime |
| GitHub Actions dry-run | 利用可能 | `release-setup.yml` + `dry_run:true` デフォルト |
| GitHub Actions protected publish | **要手動設定** | `npm-publish` environment + `NPM_TOKEN` |

## Q2: VPC / subnet / security group / NACL は正しいか？

**Answer**: N/A。`@amadeus-dlc/setup` は npm CLI パッケージであり、AWS ネットワークリソースはプロビジョニングしない。境界は GitHub Actions OIDC/token と npm registry TLS。

## Q3: Secrets Manager / Parameter Store の注入は正しいか？

**Answer**: GitHub Actions **Environment secrets** を使用（AWS Secrets Manager ではない）:

| Secret | Environment | 用途 |
|--------|-------------|------|
| `NPM_TOKEN` | `npm-publish` | `npm publish` 認証 |

`dry_run:true` パスは protected secret にアクセスしない（U8 `infrastructure-services.md`）。

## Q4: クロスアカウント / クロス VPC 接続は検証済みか？

**Answer**: N/A。外部接続は (1) GitHub → npm registry、(2) end-user → GitHub archive/tag fetch（runtime）のみ。

## Upstream References

- U8 `deployment-architecture.md`: environment 定義、dry-run / publish 境界
- U8 `infrastructure-services.md`: GitHub Actions、npm、protected publish environment
- `cd-config.md`: `npm-publish` environment、workflow permissions
