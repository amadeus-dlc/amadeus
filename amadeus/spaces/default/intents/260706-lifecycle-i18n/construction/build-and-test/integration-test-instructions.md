# Integration Test Instructions

Unit: u001-lifecycle-i18n（Test Strategy: Minimal、docs 変更）

## 適用判断

新規の統合テストは追加しない。文書間の統合点はリンク解決であり、FR-4.3 の機械照合（16 ファイルの全ローカルリンク実在 = 破損 0、流入参照 30 箇所無破壊）で検証済み（[translation-log.md](../u001-lifecycle-i18n/code-generation/translation-log.md)）。

## 実行方法

リンク照合は translation-log.md 記載の手順（python スクリプトによる全リンク解決確認）で再実行できる。
