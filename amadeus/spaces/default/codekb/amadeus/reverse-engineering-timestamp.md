# Reverse Engineering 鮮度ポインタ

## 最新観測

- Date: `2026-08-04`
- Observed commit: `499d706a25f3cc2cc0c2b1671dc4b282e3a818e1`
- Repository: `amadeus`
- Project type: Brownfield
- Scope: repository全体の共有CodeKBをlive filesystemで更新。
- Focus: Kimi Code print driverとKiro CLI ACP/TUIの現行実装、test、distribution、auth/config/child-env境界、およびcommit `12bf94ea6`で導入されたcommon live E2E policy/lifecycleとの接続seam。

## 差分基点

- Base commit: `9458bbda85eb7257310a80882b4858dc6ce3d1fc`
- 選定理由: このIntentに既存re-scanがないため、他の`re-scans/`で最新のobservedを候補とし、`git merge-base --is-ancestor` exit 0を確認。HEADからの距離は7コミット。
- Shared timestampは鮮度ポインタであり、次回のper-intent差分基点は`re-scans/<intent>.md`から選ぶ。

## 観測範囲

`packages/framework/core/`、`packages/framework/harness/{kimi,kiro}/`、`packages/setup/`、`scripts/{package,promote-self,harness-manifest}.ts`、`tests/harness/live-e2e/`、Kimi/Kiro legacy driversとe2e、root package/lock、CI、関連docsを確認した。Kiro IDE GUI/CDP、Cursor、OpenCodeの詳細調査はPhase 2 focus外としたが、全体CodeKBの配布一覧には現行構成として含めた。

## 検証制約

read-only reverse engineeringのため、課金を伴うKimi/Kiro live journey、full test suite、buildは実行していない。ローカルCLI versionはKimi `0.31.1`、Kiro `2.13.0`、Bun `1.3.13`を実測した。成果物の構造検査とdiff検査は更新後に実行する。
