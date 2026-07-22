# 最終 Functional Design ゲート — 人間裁定記録(2026-07-22)

上流入力(consumes 全数): final-fd-gate-dossier.md, live-toolchain-probe-receipt.md

## 裁定の経緯

`final-fd-gate-dossier.md`(PR #1343 で record 固定)を資料として、ユーザーへ AskUserQuestion で
4項目を諮問し、全項目の回答を得た(2026-07-22、本セッション)。E-FVEU3FD1 / E-FVEU4FD1 /
E-FVEU5FD1 の裁定が要求していた「最終 FD ゲートでの人間裁定」がこれにあたる。

## 裁定内容(ユーザー回答の転記)

| # | 諮問 | 裁定 |
| --- | --- | --- |
| 1 | PR #1345(ランナー既定タイムアウト30秒化)のマージ | 承認 → マージ済み(`7891c311e`) |
| 2 | PR #1343(record固定: probe レシート+dossier)のマージ | 承認 → マージ済み(`f4c2cfd71`) |
| 3 | U3-F3(BR-19 の finding 分類粒度)の扱い | **(b) BR-19 を改定** — 6分類は store 読取層(readCell の typed error union)へ帰属、validator 層は complete / not-store-verified + cause まで |
| 4 | DESIGNED_BLOCKED 状態の解除方針 | **解除を承認(#1342 着地後)** — U4/U5 を第三レビュー READY として確定、#1342 マージと裁定(b)反映後に解除 |

## 反映(本裁定に基づく変更)

- PR #1342(U7 残 Major 1 の閉包: verifyFullMatrix への INPUT_DRIFT 束縛検証)→ マージ済み(`2a4ac8b80`)
- BR-19 改定: `construction/execution-evidence/functional-design/business-rules.md` の BR-19 本文を
  裁定(b)どおり改定(改定注記・出典付き)
- コード反映: `evidence-completeness.ts` — 死んだ union メンバー `SUITE_TIMEOUT` の除去、
  `HANDWRITTEN` finding への実情報(cell ordinal / sample)付与
- status 解除: `MatrixIntegrationStatus` / `FinalCompositionStatus` を
  `FINAL_FD_GATE_RULED_READY` へ変更(旧値 `DESIGNED_BLOCKED_ON_U3_U4_U5_GATE` /
  `DESIGNED_BLOCKED_ON_FINAL_FD_GATE` の許可条件「最終 FD 人間裁定まで」が本裁定で満了)

## 残課題(裁定不要・記録のみ、dossier より継承)

- U3-F1 の防御分岐(「evidence ledger head changed」)の直接テスト不在
- U4: TIE 単独 unit test 不在 / U5: head/tree ドリフト専用テスト不在
- U7 FD union の `HANDWRITTEN`(matrix 側)は実装に無い — 実再現された欠陥機序なし
