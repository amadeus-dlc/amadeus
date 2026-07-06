# component-inventory — 260706-journal-logger

正本は [codekb/amadeus/component-inventory.md](../../../../codekb/amadeus/component-inventory.md)（増分更新 2026-07-06T09:06:00Z、基準 commit 19662e50。本 Intent の reverse-engineering で鮮度確認・必要分のみ更新）である。本ファイルは参照台帳として重複記述を避ける。

## 採用根拠

本 Intent の reverse-engineering は、前回基準 b452f4fb からの差分（PR #566/#564/#574 の 3 PR）を確認し、正本を採用した。更新 3 docs = code-structure（eval 32）、component-inventory（model overlay 行 + eval 32）、api-documentation（apply-model-overrides 行）。#566 は既存粒度で吸収、#574（当方）は docs のみ。conductor 直接処理（Maintainer 裁量許可と前例）。更新内訳は [codekb/amadeus/reverse-engineering-timestamp.md](../../../../codekb/amadeus/reverse-engineering-timestamp.md) と [codekb/amadeus/timestamp.md](../../../../codekb/amadeus/timestamp.md) を参照。
