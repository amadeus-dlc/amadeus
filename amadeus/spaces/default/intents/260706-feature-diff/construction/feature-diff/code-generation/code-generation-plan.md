# Code Generation Plan — feature-diff

## 上流入力

[business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[domain-entities.md](../functional-design/domain-entities.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)、[unit-of-work 相当 = feature-diff 単一 unit（units-generation は scope により SKIP）]。

## 実行計画

| 段 | 作業 | 対応 FR |
|---|---|---|
| 1 | 上流 v2（scratchpad の fresh clone、b67798c3）と Amadeus 両側の件数実測（scopes 9/10、tools 26/26、hooks 11/11、sensors 4/4、audit 70/71）+ 上流 main tree の要約実測 | FR-3.2、FR-4 |
| 2 | #428 ドリフト判断表（コメント群、8 項目）の確認 | FR-3.1、NFR-2 |
| 3 | docs/amadeus/upstream-feature-diff.md（英語正本）執筆: 冒頭 + main/v2 関係節 + サマリ表 + 12 軸 H2 節（5 列表）+ 追従手順節 | FR-1、FR-2、FR-5 |
| 4 | docs/amadeus/upstream-feature-diff.ja.md（日本語対訳、同構成）執筆 | FR-1.1、NFR-1 |
| 5 | NFR-3 決定論チェック 3 点（一時スクリプト）+ rename-leftovers + test:all | NFR-3 |
