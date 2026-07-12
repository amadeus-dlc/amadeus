# Services — metrics-observation

外部サービスの新設なし(build-vs-buy 裁定どおり)。関与する既存サービス面:

- **GitHub Actions**: ci.yml の job 追加(C5)。GITHUB_TOKEN push の非再トリガー性(release.yml 前例)でループ防止。
- **Codecov**: 変更なし(カバレッジ可視化の既存担当)。snapshot はアップロード経路に非接触。
- **git(リポジトリ自身)**: metrics/ 配下が唯一の永続ストア(metrics-as-code)。
