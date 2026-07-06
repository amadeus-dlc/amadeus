# Unit Test Instructions

Unit: guide-ops（Test Strategy: Minimal）

## 検証対象と手順

| 対象 | 手順 | 期待結果 |
|---|---|---|
| help 掲載の無改変（NFR-1） | 12 章の 5 block を help-output.txt（全 50 行）と照合 | 完全一致（subagent B + stage reviewer が独立照合） |
| 数値・名称の実体一致 | 14 agents の内訳・4 択の文言と順序・reviewer 契約を実体と照合 | 一致（初見レビュー High 4 件の修正含む） |
| 英語正本の日本語残存 / H2 対一致 | grep / 見出し数比較（[code-summary.md](../guide-ops/code-generation/code-summary.md)） | 0 件 / 3 対 + index 対一致 |
| リンク解決（NFR-5） | scratchpad の一時 checker（新章 6 ファイルへ拡張済み） | checked=198 broken=0 |
| record 構造 | `bun .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260706-guide-ops` | pass |

## 結果

全件 pass。詳細は [build-test-results.md](build-test-results.md) を参照する。
