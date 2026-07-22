# Security Requirements — stage-contract

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。raw frontmatter、Unit edge、runtime graphをuntrusted inputとしてfail-closedに検証する。

## Input integrity

| ID | control | 合格条件 |
|---|---|---|
| SEC-U01-01 | UnitKindはlibのclosed 5語彙だけ。 | unknown kindをmutation前reject。 |
| SEC-U01-02 | 5 fieldはE-USSU01FD3 exact-shapeだけを受理。 | wrong type/empty/malformed/unknown predicateをreject。 |
| SEC-U01-03 | produces_kinds key/value/referenceを検証。 | orphan、empty list、duplicate、unknown kindをreject。 |
| SEC-U01-04 | validation failureはsource/graph/state/audit/生成物を不変にする。 | before/after bytes一致。 |

`when`は保存だけで評価せず、unknown predicateをpermissionや実行条件へ昇格させない。errorはfield、Unit、実値、許容値を既存面へ示し、新eventを追加しない。

## Supply chain・compliance

新runtime dependency、network、database、UI、credential面を追加しない。sourceからgeneratorで6 harnessへ投影し、dist手編集を禁止する。追加規制要件や保持期間を新設しない。

## トレーサビリティ

SEC-U01-01〜04は`business-rules.md`のBR-U01-01〜15、`business-logic-model.md`のエラーと副作用、`requirements.md`のNFR-2/3/8、`technology-stack.md`に対応する。
