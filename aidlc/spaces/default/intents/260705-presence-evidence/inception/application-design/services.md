# Services — Presence Evidence（260705-presence-evidence）

上流入力: [components.md](components.md)

## 適用判断

外部サービス・新規依存はない（文書変更のみ）。既存検証基盤（validator、test:all）だけを使う。

## 既存基盤の利用

- validator（構造検証）と `npm run test:all`（回帰）をそのまま使う。新規の検証入口は作らない。
