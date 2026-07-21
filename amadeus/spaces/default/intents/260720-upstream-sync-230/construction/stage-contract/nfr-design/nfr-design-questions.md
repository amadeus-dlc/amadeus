# NFR Design Questions — stage-contract

> 上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。
>
> 対象: engine順U11 / 正本Unit U01 `stage-contract`。承認済みNFRと正準4 public seamを既存schema/graph/directive/coverage/approval/package/test境界へ機械配置する。
>
> E-OC1 判定: **質問0問**。E-USSU11ND1 recorded裁定 `2026-07-21T02:47:05Z`。

## 質問不要の根拠

- Schema: UnitKindはlibのclosed 5語彙、追加5 fieldはexact-shape、absent property非生成、追加canonicalizationなし、invalid時全mutation前rejectで既決である。
- Pipeline: 正準4 seamと内部parse/emit/filter、required+optional unionの一回filter、kindless/mapless full matrixが固定済みである。
- Coverage: filter後required 0だけvacuous、元required 0は実行証拠なし、applicable required全fileまでuncovered、optional exemptが既決である。
- Scalability: current 12 Unit、6 harness、4 self-install、5 UnitKindのclosed inventoryを単一typed snapshot/generatorで扱う。
- Logical components: vocabulary/schema validator、parser/emitter、graph compiler、kind filter、directive/coverage/approval consumers、package/test境界へ閉じる。

新public API、accepted shape、canonicalization、kind mapping、vacuous semantics、when evaluator、schema DSL、dependency、SLO、serviceを選ぶ余地はない。新判断が必要なら確定前にleaderへ再付議する。

## [Answer]

[Answer]: 質問0問で可 — 既決契約からの機械導出。E-USSU11ND1はchoice 1を3票、choice 2/3を0票、GoA 1を3票、留保なしで裁定した（開票 `2026-07-21T02:47:05Z`）。承認範囲はUnitKind lib単一closed 5語彙、正準4 seam、追加5 field exact-shape・absent非生成・canonicalizationなし、produces_kinds fail-closed、kindless/mapless full matrix、required/optional対称prune、filter後required 0のみvacuous、applicable required全fileまでuncovered、optional exemptを既決契約から機械導出する範囲に限定する。新public API、新shape、新canonicalization、新kind mapping、新vacuous/when evaluator、schema DSL、dependency、SLO、serviceは追加しない。
