# CD Config — harness-provenance

上流入力(consumes 全数): `ci-config`、`quality-gates`、`deployment-architecture`、`cicd-pipeline`。

## 正本

CDの唯一の正本は既存`.github/workflows/release.yml`であり、本intentでは変更しない。`deployment-architecture`が定義するlocal Bun/package配布に対し、`cicd-pipeline`のsource→dist→self-install検証を`ci-config`と`quality-gates`がPR時に完了させる。release workflowは検証済み`main`からversioned artifactを生成する。

## Trigger and approval

| 項目 | 設定 |
|---|---|
| Primary trigger | 人間による`workflow_dispatch` |
| Inputs | bump=`patch|minor|major`、`dry-run` |
| Fallback trigger | `v*` tag push |
| Source guard | dispatchは`main`のみ。tagはpackage version一致かつ`main` ancestorのみ |
| Concurrency | `release-setup`、cancelなし |
| Approval | PRのCI/review/merge承認と、release dispatchの人間操作 |

本intentからdispatch、tag、version bump、publishは実行しない。

## Release flow

1. GitHub App tokenを既存secretから発行する。
2. full history/tagをcheckoutし、Bun 1.3.13とNode 22を準備する。
3. `bun install --frozen-lockfile`を実行する。
4. release-itがversion同期、commit、`vX.Y.Z` tag、pushを行う。`dry-run`では外部変更しない。
5. GitHub Releaseを自動notes付きで作成する。
6. `packages/setup/dist/cli.js`をfresh buildする。
7. npmへprovenance付きpublishする。prereleaseは`next` tagを使う。

## Secrets and permissions

新規secret・IAM・environment protection・network policyは追加しない。既存`METRICS_BOT_CLIENT_ID`、`METRICS_BOT_PRIVATE_KEY`、`NPM_TOKEN`だけをrelease workflow内で使用する。workflow top-levelは`contents: read`、GitHub App tokenだけをrelease writeへ限定し、npm provenance用`id-token: write`を維持する。

## Artifact policy

- GitHub Release: `vX.Y.Z`と自動生成notes
- npm: `@amadeus-dlc/setup`、provenance付き、同一version上書きなし
- source/dist/self-install: Git管理し、CI drift guardで一致を保証
- `Harness`付きV7 state: package artifactではなく利用者workspaceの永続データ。release/rollbackで削除・移行しない

## Validation

```bash
bun test tests/integration/t223-release-bot-bypass.integration.test.ts
bun test tests/integration/t228-settings-docs-sync.test.ts
ruby -e 'require "yaml"; YAML.load_file(".github/workflows/release.yml", aliases: true)'
git diff --exit-code -- .github/workflows/release.yml
```
