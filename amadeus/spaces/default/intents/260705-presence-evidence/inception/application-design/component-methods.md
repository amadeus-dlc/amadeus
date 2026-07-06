# Component Methods — Presence Evidence（260705-presence-evidence）

上流入力: [components.md](components.md)

## 適用判断

関数・メソッドの新設はない（C-1: エンジンコード変更なし）。本文書は「変更対象の文書とその検証手段」の契約を代替として記す。

## 契約

| 対象 | 契約 |
|---|---|
| audit-format.md への追記 | 独立 H2 節（Event Registry 外）。イベント表を持たないため冒頭カウント（70 events, 18 categories）は更新不要（refined-mockups の場合分けどおり） |
| 執筆時検証 | verifyDocsOnlyEvidence（tools/amadeus-state.ts）を再読了し、記述と実装の一致を code-summary に記録（FR-2.3） |
| 回帰検証 | validator + npm run test:all + parity:check の pass |
