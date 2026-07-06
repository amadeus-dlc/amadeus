# Security Test Instructions

Unit: docs-lang-guide（Test Strategy: Minimal）

## 適用判断

不適用とする。

## 根拠

本 Intent は docs/amadeus 配下の文書と参照追記のみで、認証・入力境界・秘密情報・実行経路に触れない。秘密情報のハードコードがないことは diff の目視と lint で確認した。
