# Performance Test Instructions

Unit: overlay-reverse（bugfix scope、Test Strategy: Minimal）

## 適用判断

不適用。本変更は install 1 回あたり agent md（14 ファイル、うち往復対象は overlay 宣言 2 件のみ）への文字列 1 回の置換であり、性能 SLO を持たない。追加の I/O は overlay 宣言ファイルの 1 回読み込みのみ（`copyEngine` 先頭で 1 回）。性能テストは設定しない。
