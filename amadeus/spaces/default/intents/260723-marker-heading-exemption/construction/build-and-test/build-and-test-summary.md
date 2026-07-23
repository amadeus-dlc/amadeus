# Build & Test Summary — 260723-marker-heading-exemption

上流入力(consumes 全数): code-generation-plan、code-summary

## 総括

Issue #1296 修正(marker 成果物の required-sections H2 floor 免除)は PR #1405 として main 着地済み(マージ 2026-07-23、#1296 クローズ済み)。build-and-test は着地後の本線 merge 断面で全検証を再実測し、**全 green** を確認した(build-test-results.md)。

- ビルド/配布: dist:check・promote:self:check green(11 コピー同期維持)
- ユニット: t155(免除+対照+述語)/ t86(marker_exempt 消費配線)/ t218(in-process DA 閉包)/ registry(宇宙 497)全 pass
- 統合: `--ci` 全数 463 files / 6650 assertions / 0 fail
- 閉包: FR-7 再現コマンド verbatim が `pass:true`+`marker_exempt:true`(両クラス)
- 性能/セキュリティ: N/A(反証可能な根拠付き — 各 instructions 参照。既存必須検査は全て通過)

## 残課題

なし(B 縮退分岐は非発動 — marker_exempt の消費配線は t86 で成立)。E-FVEPD 運用ノルムの縮約は蒸留ラウンド事項として申し送り済み(requirements Out of Scope)。
