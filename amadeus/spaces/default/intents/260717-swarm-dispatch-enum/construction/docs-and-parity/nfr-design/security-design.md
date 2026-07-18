# Security Design — docs-and-parity(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## 設計

- SD-D1(SNR-D1): docs 変更は既存文書の書き換えのみで新規秘匿情報源を持たない — token/credential の混入面は引用転記(U1 決定表・U2 表示文言)に限定
- SD-D2(SNR-D2): C-14 開示の禁止フレーズ検査は canonical 6 句(CU-1 → U1 ND RD-4)への docs diff grep — 集合の独自定義なし

## 保証機構(層別)

- 転記層: 引用元(U1/U2 成果物)自体が禁止フレーズゼロ(各 unit の検査で担保)
- diff 層: U3 変更分への 6 句 grep(受け入れ = 0 件)
