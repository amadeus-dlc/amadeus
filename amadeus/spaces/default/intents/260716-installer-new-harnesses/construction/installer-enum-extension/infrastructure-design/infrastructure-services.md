# Infrastructure Services — U1 installer-enum-extension(Issue #1048)

上流入力(consumes 全数): `../nfr-design/performance-design.md`、`../nfr-design/security-design.md`、`../nfr-design/scalability-design.md`、`../nfr-design/reliability-design.md`、`../nfr-design/logical-components.md`、`../../../inception/application-design/components.md`、`../../../inception/application-design/services.md`、`../functional-design/business-logic-model.md`。

## サービス目録(provisioning:c3 様式 — 実在と N/A の分離)

| 候補 | 判定 | 根拠 |
|---|---|---|
| GitHub(リポジトリ・Actions・Releases) | 実在・既存 — 変更なし | CI/配布の既存正本。本 unit は workflow ファイルへ非接触 |
| npm レジストリ | 実在・既存 — 変更なし | 公開は release.yml の別ライフサイクル。本 unit は `npm pack --dry-run`(ローカル)のみ |
| クラウドインフラ(AWS 等) | N/A | project.md Deployment「デプロイ基盤は持たず」— 反証可能な不存在根拠 |
| データベース・キュー・キャッシュ | N/A | 単発 CLI・永続データなし(SC-3 継承) |

## 新規プロビジョニング

なし — 実在リソースの追加・変更ゼロ。
