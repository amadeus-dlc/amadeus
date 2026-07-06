# Design System Mapping — Presence Evidence（260705-presence-evidence）

上流入力: [mockups.md](mockups.md)

## 適用判断

GUI デザインシステムは不適用。文書スタイルの正は audit-format.md 自身（全文英語、既存見出し体系、自己参照カウント）とする。

## 対応

| 要素 | 正 |
|---|---|
| 言語 | 英語（NFR-1 で確定） |
| 見出し様式・語彙 | audit-format.md の既存節に一致（FR-1.5） |
| カウント整合 | O-1 の帰結に依存: Event Registry 内の H3 カテゴリとして挿入する場合は「### 見出し (N events)」様式と冒頭カウント（70 events, 18 categories）の両方に影響するが、本追記はイベント表を持たない説明文のため 0 件カテゴリになり様式と不整合 → 独立 H2 節（Format Standards 類似の説明節）として置くのが自然で、その場合はカウント更新不要。確定は functional-design（FR-1.5） |
