# Code Summary — feature-diff

## 上流入力

[business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[domain-entities.md](../functional-design/domain-entities.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)、[unit-of-work 相当 = feature-diff 単一 unit（units-generation は scope により SKIP）]。

## 実施結果

| 変更 | 内容 | 結果 |
|---|---|---|
| upstream-feature-diff.md（新規） | 英語正本。main/v2 関係の要約節、サマリ表（12 軸 × 4 区分）、12 軸の 5 列三者比較表（全行に出典）、追従手順 5 手順 | 145 行相当 |
| upstream-feature-diff.ja.md（新規） | 日本語対訳（同構成、H2 15 節一致） | 同構成 |

## 実測記録（FR-3.2）

両側実測: 上流 v2（b67798c3 fresh clone）= scopes 9 / tools 26 / hooks 11 / sensors 4 / audit 70 events。Amadeus = scopes 10 / tools 26 / hooks 11 / sensors 4 / audit 71 events。上流 main tree = .claude / .kiro / aidlc-rules / docs / scripts（v1 系）。差分の意味付けは #428 ドリフト表（8 項目）と #552 設計確定に整合。

## 検証記録（NFR-3）

| 検証 | 結果 |
|---|---|
| チェック①出典列の空欄行 | 0 件（en / ja、一時スクリプトで機械確認） |
| チェック②正準 H2 12 対の存在 | en / ja とも欠落 0 |
| チェック③en/ja の H2 構成一致 | 15 = 15 で一致 |
| rename-leftovers（docs 走査対象） | pass（旧名トークンなし） |
| npm run test:all | 実行結果は build-and-test で記録 |
