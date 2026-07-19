# Security Requirements — election-record(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 入力検証(fail-closed)

- GoA 行のコードは branded `GoaLineCode`(`^E-[A-Z0-9]+$`)の fail-closed スマートコンストラクタで検証(business-logic-model.md — E-ETF-FD2 Q3=A 裁定)。複節ハイフンコードは reject(business-rules.md BR-R1 fixture)
- verify 系(verifyReservations/verifySelf)は読み取り専用の検査で、対象文書を変更しない(requirements.md FR-6b の self-check+外部検査 CLI)
- 度数・件数は入力票データからの再計算のみ(BR-R2/R4 — 外部入力の数値を無検証で信用しない)

## 秘匿情報と公開境界

- 秘匿情報を扱わない。票の全文ファイル化は開票時のみ(requirements.md FR-5b — blind 解除は S-07 の設計どおり開票後の監査可能性回復であり、開票前の票は U3 に到達しない)
- 新規 runtime 依存を導入しないため、依存由来の攻撃面を既存スタック(technology-stack.md の Bun/TS 現行構成)から拡大しない
