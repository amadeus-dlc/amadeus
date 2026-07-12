# Environment Inventory

## 上流

`deployment-architecture.md`、`infrastructure-services.md`、`cd-config.md` を入力とする。AWS/クラウド/runtime environmentは存在せず、provision対象はない。

## 実在inventory

| Component | State | Purpose |
|---|---|---|
| GitHub Actions `.github/workflows/ci.yml` | Existing | main限定snapshot job |
| GitHub-hosted `ubuntu-latest` runner | Ephemeral | collector実行 |
| `amadeus-coverage-report` artifact | Ephemeral | coverage/test totals受渡し |
| Repository `metrics/*.json` | Version controlled | append-only観測値 |
| Repository `GITHUB_TOKEN` | Job-scoped | main書戻し、`contents: write` |

## N/A inventory

AWS account、VPC、subnet、security group、NACL、IAM role、Secrets Manager、Parameter Store、CDK/CloudFormation stack、runtime service、dev/staging/prod environmentは全てN/Aで、作成・変更・認証確認を行わない。
