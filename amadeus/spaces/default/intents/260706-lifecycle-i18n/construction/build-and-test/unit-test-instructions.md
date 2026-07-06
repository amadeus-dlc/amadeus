# Unit Test Instructions

Unit: u001-lifecycle-i18n（Test Strategy: Minimal、docs 変更）

## 適用判断

新規の unit test は追加しない。本 Intent はコード変更を含まない文書の対訳ペア化であり、検証の実体は #541 純正性検証と対訳パリティ検証（[translation-log.md](../u001-lifecycle-i18n/code-generation/translation-log.md)）である。

## 回帰確認

既存検証は `npm run test:all` の全段通過で回帰なしを確認する。結果は [build-test-results.md](build-test-results.md) を参照。
