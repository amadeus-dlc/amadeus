# Business Rules — election-record(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## ルール一覧

| # | ルール | 由来 | テスト |
|---|---|---|---|
| BR-R1 | renderGoaLine の出力は parseGoaLine(norm-metrics.ts:688)で round-trip parse 可能(byte 互換) | FR-5a、C-08 | 実 parseGoaLine を import した round-trip テスト(度数分布3パターン) |
| BR-R2 | GoA 度数は受理済み票のみから再計算され、後着票は本集計に混入しない | FR-3d/5a | 後着混在 fixture で本集計不変 |
| BR-R3 | verifyReservations: 留保必須票件数 vs 転記件数の不一致を検出(転記欠落の落ちる実証) | FR-6a | 欠落注入 → fail、一致 → pass |
| BR-R4 | verifySelf: 票数不一致・度数再計算不一致・時系列逆行の3クラスを検出 | FR-6b | 各クラス注入の落ちる実証 |
| BR-R5 | render 出力は同一入力から常に同一(決定性) | NFR-3 | 2回実行 deep-equal |
| BR-R6 | persist 素案は留保を全件転記する(citation-reservation-preservation の機械化) | FR-5a/6a | 留保3件 fixture で3件転記 assert |

## 落ちる実証

BR-R3/R4 の検査述語の実行時消費行へ注入(検出恒偽化)し赤→revert(NFR-2)。
