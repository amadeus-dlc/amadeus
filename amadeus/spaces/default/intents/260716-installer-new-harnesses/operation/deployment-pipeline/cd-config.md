# CD Config — Issue #1048(既存経路の文書化 — CD 基盤なし)

上流入力(consumes 全数): `../ci-pipeline/ci-config.md`、`../ci-pipeline/quality-gates.md`、`../installer-enum-extension/infrastructure-design/deployment-architecture.md`、`../installer-enum-extension/infrastructure-design/cicd-pipeline.md`。

## 配布経路(変更なし)

- main マージ = 配布物確定(dist 6ツリー+self-install 2ツリーはリポジトリ内コミット — drift guard が同期を機械保証)
- npm 公開 = release.yml(workflow_dispatch → release-it)の既存一本。本 intent はバージョン・タグ・リリースノート非接触(project.md Mandated)
- ステージング/本番の環境分離なし(deployment-architecture.md の根拠付き N/A)

## 本 intent の CD 変更

なし — PR #1109 の main 着地(6f11f6d5c、auto マージ実測 17:49Z)で配布物は確定済み。次回 release.yml 実行時に npm へ自然に含まれる。
