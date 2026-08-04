# コード生成サマリー — pi-user-maintainer-guides

## 変更内容

- `docs/guide/harnesses/pi.md` と `pi.ja.md` を追加した。
- root READMEと日英harness indexへPi guideリンクを追加した。
- 日英porting guideへPi resource/event/driver/test/generated inventoryを追加した。
- manifest、event set、package metadataから動的に照合するclosed docs contract testを追加した。

## 実装判断

- Pi native trustはsandboxではなく、extension/packageはhost user権限でcodeを実行し得ると明記した。
- Pi Package local/gitはnative entry activationであり、matching setup-installed runtime/catalog/receiptを伴う完全installの代替ではないと明記した。
- 固定resource件数や未検証live greenを記載せず、実装中のcatalogからinventoryを検査する。

## テスト結果

- referee: converged、tamperなし。
- docs/link/manifest/dist/package tests: 20件成功、0件失敗。
- `bun scripts/package.ts pi --check`: 成功。
- `bun run typecheck`: 成功。
- 対象Biome、`git diff --check`: 成功。

## 計画との差分

- なし。
