# component-inventory — 260705-persist-cid-metamain

正本は [codekb/amadeus/component-inventory.md](../../../../codekb/amadeus/component-inventory.md)（増分更新 2026-07-05T23:25:37Z、基準 commit 616d063e、本 Intent の reverse-engineering で更新）である。本ファイルは参照台帳として重複記述を避ける。

## 採用根拠

本 Intent の reverse-engineering は、旧解析基準 3049eadf からの非 aidlc 差分（39 ファイル、+2700/-56。PR #489 / #505 / #508）を列挙・影響評価し、正本 codekb/amadeus/ を差分駆動で増分更新した（フル再解析ではない。更新 7 docs / 据え置き 2 docs の内訳は [codekb/amadeus/timestamp.md](../../../../codekb/amadeus/timestamp.md) を参照）。#505 の #498 修正により、produces が worktree からも正しく codekb/amadeus/ へ解決される正規経路の初実走である。
