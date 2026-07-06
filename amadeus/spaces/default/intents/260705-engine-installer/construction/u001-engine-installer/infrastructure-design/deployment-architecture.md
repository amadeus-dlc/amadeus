# Deployment Architecture — u001-engine-installer（260705-engine-installer）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)、[services.md](../../../inception/application-design/services.md)

## 配置アーキテクチャ

クラウド・サーバ配置は存在しない。「デプロイ」に相当するのは次の 2 面である。

| 面 | 内容 |
|---|---|
| インストーラ自体の配布 | 本リポジトリの clone（grilling 確定 4。レジストリ公開は BL-1 = 将来） |
| エンジンの配布（インストーラの仕事） | clone → `bun run scripts/amadeus-install.ts --target <workspace>` によるローカルファイル配置（フルセット、D1） |

## 適用判断

IaC・環境分離（dev/stg/prod）・コンテナ化は不適用とする（対象はローカル workspace のファイル配置のみ。Right-Sizing）。
