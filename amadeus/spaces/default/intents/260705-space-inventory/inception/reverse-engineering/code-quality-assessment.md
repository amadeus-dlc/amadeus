# Code Quality Assessment — 260705-space-inventory

上流入力: Maintainer 直接指示（2026-07-05 チャット）

## 評価

ズレの型は 3 種: (1) 廃止機構への参照残存（intents.md、IndexGenerate.ts）、(2) 実在しない例・ファイル（260629 record、phases 3 ファイル）、(3) 実装変更に未追従の規約（Unit 命名の大文字）。いずれも「参照先の実在」を機械検査していない文書に集中しており、knowledge/ のような自己完結文書にはズレが無かった。
