# CI Pipeline Questions — harness-provenance

上流入力(consumes 全数): `code-summary`、`build-and-test-summary`、`build-test-results`。

## 選挙・明確化不要判定

明確化質問は0件。`code-summary`は新規dependency・IaC・network・独立serviceを追加しておらず、`build-and-test-summary`と`build-test-results`は既存Bun CIコマンドで検証完了している。さらにproject rule `ci-pipeline:c2`が、既存workflowへ実装済みの場合は新規workflowを二重生成せず、既存workflowを唯一の正本として文書化・検証するよう規定している。

## 既決事項

| 項目 | 決定 | 根拠 |
|---|---|---|
| CI tool | GitHub Actions | `.github/workflows/ci.yml` |
| Branch strategy | `main`中心の短命branch、PR、squash merge | org/team/project rules |
| Merge quality gates | typecheck、lint、complexity、dist/self-install drift、CI tests、coverage | 既存`ci.yml`と`CI Success`集約 |
| Artifact repositories | CI証跡はGitHub Actions artifacts、release packageはnpm | `ci.yml`と`release.yml` |

## 質問

なし。既存CIに新規job、secret、artifact repository、branch、quality thresholdを追加する判断は発生しない。
