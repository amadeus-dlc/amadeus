# Security Test Instructions — intent 260813-advisory-requestion-fix

## 判定: 適用可能なセキュリティ NFR は存在しない(認可境界の既存回帰は維持)

本 intent 専用のセキュリティテストは**新設しない**(cid:build-and-test:c2-no-test-theatre-for-absent-nfr)。ただし本修正は認可に関わる面(advisory の autonomy ladder 裁定・receipt 受理)に触れるため、**既存の認可回帰を無退行で維持することが本 intent のセキュリティ検証**である(project.md Mandated「認可に関わる変更を directive contract・state transition・audit invariant のテストで検証」)。

## 根拠と対応する実測

- fail-closed 維持: 未認可・grounding 失敗・presentation 欠如・store 破損はすべて `refused` として human へ落ちる(`t458` の fail-closed 4系統、`t-advisory-choice-record` の拒否12件 — `code-summary.md` の green 実測 142 pass に含まれる)
- 禁止効果バリア・single-spend・provenance crossing の無退行: `t459` / `t458`(同上)
- 「既 settled」判定は同一 provenance の spend 実績 + open 空でのみ成立し、open が残る場合は refusal(fail-open 防止が型で固定 — `t2967-advisory-record-outcome`)

## この判定を覆す条件

- advisory 裁定に新しい権限種別・外部入力面(例: リモート由来の handoff 宣言)が加わる場合、当該境界の入力検証テストとセキュリティ NFR を宣言して追加する
