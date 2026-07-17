# Business Rules — eoc1-gate-guard

## 上流入力(consumes 全数)

`../../../inception/application-design/component-methods.md`(判定順・blank 決定的規則)、`../../../inception/requirements-analysis/requirements.md`(AC-1a〜1c)、`../../../inception/refined-mockups/mockups.md`(M-1〜M-3)、`../../../inception/units-generation/unit-of-work.md`。

## 規則(AC 対応)

| BR | 規則 | AC |
|----|------|----|
| BR-1 | ファイル不在 → pass(no-file) | AC-1a 3形 |
| BR-2 | [Answer] タグ不在 → pass(no-answer-tag)— E-OC1 0問様式 | AC-1a 3形 |
| BR-3 | blank(空 / N/A(大小無視)/ 全体が1丸括弧グループ(半角/全角))→ pass(answer-blank) | AC-1a 3形+AD 決定的規則 |
| BR-4 | 記入あり∧(E-code `/E-[A-Z0-9][A-Z0-9-]*/` ∨ 承認 ts 行(「承認」含む行の ISO 8601 を Date.parse 数値検証))→ pass(evidence-present) | AC-1a 含意形 |
| BR-5 | 記入あり∧承認行あり∧ts parse 不能 → fail(unparseable-timestamp) | AC-1b/M-2 |
| BR-6 | 記入あり∧証跡なし → fail(no-evidence) | AC-1a/M-1 |
| BR-7 | fail → error()(exit 1・STAGE_AWAITING_APPROVAL 非 emit・checkbox 非遷移。ERROR_LOGGED は既存挙動) | AC-2a/M-1・M-2 |
