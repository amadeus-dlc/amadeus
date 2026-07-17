# Business Rules — answer-evidence-sensor

上流入力(consumes 全数): `../../inception/units-generation/unit-of-work.md`(単一 Unit)、`../../inception/units-generation/unit-of-work-story-map.md`、`../../inception/requirements-analysis/requirements.md`(FR-1〜7)、`../../inception/application-design/components.md`(C-1〜C-5)、`../../inception/application-design/component-methods.md`、`../../inception/application-design/services.md`(二層防衛)。

## ルール一覧

| # | ルール | 由来 |
|---|--------|------|
| R1 | 記入済み [Answer] は E-code 裁定参照(Answer 行内)or parse 可能 leader 承認 ISO TS を要する — 述語意味論そのまま(無改修) | FR-1 AC-1c / C1 |
| R2 | 空欄・N.A.・単一括弧プレースホルダ・タグ不在(0問様式)・ファイル不在 = pass | 述語 pass 4 reason |
| R3 | cutoff(260716)前の intent は常に pass | FR-2 / ADR-3 |
| R4 | 非 questions ファイルは常に pass(skipped 顕名) | AC-1d / ADR-4 |
| R5 | 検査結果は exit code に載せない(advisory)— CLI 誤用のみ exit 1 | AC-1e |
| R6 | Answer 行の地の文 E-code は evidence-present(述語の既知の限界 — テストで文書化ピン) | AC-4c(RA reviewer Minor-1 反映) |

## ルールの検証対応

R1〜R6 は C-5 テストの個別ケースへ 1:1 で落ちる(R6 は vacuity/限界文書化ピン、R3/R4 は skip 2形、R5 は exit code 検証)。
