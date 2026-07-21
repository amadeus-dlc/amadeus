# NFR Requirements Questions — stage-contract

> 上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。
>
> 対象: U01 `stage-contract`。E-USSUFD1/FD2、E-USSU01FD3=Aを含むschema、Unit kind、graph/directive/coverage契約をNFRへ機械導出する。
>
> E-OC1 判定: **質問0問**。leader承認 `2026-07-20T15:36:18Z`。

## 質問不要の根拠

- Performance/scalability: pure parse/validate/compile/filterと既存6 harness projectionであり、新service SLOはない。
- Security: closed UnitKind、exact-shape field validation、unknown/orphan/malformedの全mutation前rejectを既決どおり適用する。
- Reliability: kind未指定/full matrix、filter後vacuous、required/optional対称pruning、compile byte-identical、absent property/bytes不変が裁定済みである。
- Observability: field/Unit/実値/許容値を既存errorへ示し、新event・保持期間を追加しない。
- Technology: Bun/TypeScript、lib単一語彙、既存schema/graph/generator/test stackを維持し、新dependency/network/database/UIを追加しない。

新しいaccepted language、canonicalization、kind mapping、vacuous semantics、public APIを選ぶ余地はない。新たなschema/failure/compatibility判断が必要なら停止し、再付議する。

## [Answer]

[Answer]: 質問0問で可。E-OC1でleader承認済み（`2026-07-20T15:36:18Z`）。承認範囲はE-USSUFD1/FD2、E-USSU01FD3=A、BR-U01-01〜15、Requirements NFR-1〜8、technology-stackの機械導出に限定する。UnitKind lib単一所有、正準4 public seam、5 field exact-shape、追加canonicalizationなし、absent property/bytes不変、invalid mutation前reject、kind未指定full matrix、対称pruning、vacuous区別、directive/coverage同一snapshot、compile byte-identical、既存6/4配布境界を維持する。新accepted language、canonicalization、kind mapping、vacuous/failure policy、public API、dependency、network、database、UI、保持期間、SLOは追加しない。
