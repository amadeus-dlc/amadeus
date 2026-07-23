# Tech Stack Decisions — team-mode-docs

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack(本文で参照)

## 技術スタック決定

- 新規ツール・依存ゼロ: 既存 docs 体系(technology-stack の docs/ 構成)と既存ガード(t174 系)のみを使用。コード・型の変更なし(導出: business-logic-model の作業項目が全て文書生成・grep 検証であることから — 直接引用ではない)
- ガイド番号 20 は実装時に最新帯を再確認(business-rules — 並行 intent の docs 追加との衝突回避。requirements の消費側棚卸し面)

## 決定事項

- 追加のスタック決定なし(ドキュメント Unit — 生成様式は既存ガイドの既習様式へ完全準拠、新規様式を発明しない)
