# Deployment Architecture — install-flow

> ステージ: infrastructure-design (3.4) / Unit: install-flow / 作成: 2026-07-08
> 出典: `../nfr-design/security-design.md`(書き込み封じ込め)、U1 infrastructure-design/deployment-architecture.md

## 配置トポロジー(U1 との差分)

U1 のトポロジーに「対象プロジェクトディレクトリへの書き込み面」が加わるのみ(SafeTargetPath で封じ込め)。所有インフラなし・新規外部サービスなし。

- 導入成果物の配置はユーザーのリポジトリ内(`.claude/` 等+`amadeus/.installer/` マニフェスト)— これは「ユーザー所有領域への成果物配置」であり、こちらが運用するインフラではない
