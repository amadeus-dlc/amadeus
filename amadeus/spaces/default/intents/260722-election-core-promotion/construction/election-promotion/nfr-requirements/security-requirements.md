# Security Requirements — election-promotion

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack(本文で参照)

## セキュリティ要件

- コード変更は import 1行のみ(business-logic-model)— 新規の入力境界・認可面・秘密情報なし(requirements NFR-2 の挙動不変)
- 選挙 store の既存 fail-closed 契約(#1273 系)を変更しない — 出典 = requirements の将来条件チェックリスト c4「クラッシュ耐性」節 verbatim「選挙 store の既存 atomic 契約(fail-closed ballot 等 #1273 系)を変更しないことで担保」(※iter1 で technology-stack へ誤帰属 — requirements 正本へ訂正)。technology-stack への実参照は本ファイルでは実行環境面(Bun 直接実行・非常駐)の記述に限る
- SKILL.md 書き換え(business-rules BR-3)は参照パスの置換のみで実行意味論を変えない。実行環境は technology-stack のとおり Bun 直接実行の単発 CLI(常駐なし)で、移動後も変わらない

## 検証

- 追加検査なし(N/A 根拠: 攻撃面の変更なし — build-and-test:c3。既存必須 scan 維持)
