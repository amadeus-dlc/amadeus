# CD Config — eoc1-gate-check

## 上流入力(consumes 全数)

`../../construction/eoc1-gate-guard/infrastructure-design/deployment-architecture.md`(配布=npm/タグ、デプロイ基盤なし)、`../../construction/ci-pipeline/ci-config.md`、`../../construction/build-and-test/build-and-test-summary.md`、`../../construction/ci-pipeline/quality-gates.md`。

## 構成(project.md Deployment 既定 — 新規 CD なし)

デプロイ基盤は持たない — リリースは release.yml(workflow_dispatch → release-it)一本(既決)。本 intent は main 着地(PR #1106 スカッシュ)で配布ツリーに反映され、次回リリースに自動同梱。CD 固有の追加設定なし(N/A、根拠 = project.md Deployment 節)。
