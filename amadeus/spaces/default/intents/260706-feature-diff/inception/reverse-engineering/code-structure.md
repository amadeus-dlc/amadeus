# code-structure — 260706-feature-diff

正本は [codekb/amadeus/code-structure.md](../../../../codekb/amadeus/code-structure.md)（増分更新 2026-07-06T07:58:00Z、基準 commit b452f4fb。本 Intent の reverse-engineering で鮮度確認・必要分のみ更新）である。本ファイルは参照台帳として重複記述を避ける。

## 採用根拠

本 Intent の reverse-engineering は、前回基準 9dd93f50 からの差分（PR #559/#561/#563/#565 の 4 PR）を確認し、正本を採用した。更新は code-structure.md（harness/codex/ 層の行）と component-inventory.md（Codex guard 行）の 2 docs。#559 のエンジン整合修正と #561/#563 の docs 変更は既存記述粒度で吸収。conductor 直接処理（#565 の当事者知識と docs 中心差分のため。Maintainer の裁量許可）。更新内訳は [codekb/amadeus/reverse-engineering-timestamp.md](../../../../codekb/amadeus/reverse-engineering-timestamp.md) と [codekb/amadeus/timestamp.md](../../../../codekb/amadeus/timestamp.md) を参照。
