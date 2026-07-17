# Scope Definition — Questions(260717-mirror-issue-tool)

モード: Guide me

## 上流入力

上流入力(consumes 全数): intent-statement.md(intent-capture)、feasibility-assessment.md、constraint-register.md(feasibility)— in/out 境界は成功指標と制約 C1-C8 から導出。

E-OC1 証跡: ソロモード — ユーザーの AskUserQuestion 直答(実 HUMAN_TURN)による裁定であり選挙不要。ユーザー承認タイムスタンプ: Q1/Q2 とも 2026-07-17T13:01:49Z(AskUserQuestion 直答。Q1 は初回提示時に自由入力が挟まったため再提示で確定)

## Q1. 自動化(フック/エンジン連動)の in/out

park・complete 等の節目で sync を自動発火するフック連動を本 intent に含めるか。

A. out — 本 intent は手動3コマンド(create/sync/close)のみ。フック連動は運用効果を見て別 intent(intent-statement のスコープ感どおり)
B. in — 最初からフック連動まで作る
X. Other (please specify)

[Answer]: A(out — 手動3コマンドのみ。フック連動は別 intent)— 2026-07-17T13:01:49Z, Mode: guided

## Q2. ミラー Issue の識別ラベル

ミラー Issue を通常 Issue と区別する GitHub ラベルを新設するか。

A. 新設する(例: `intent-mirror`)— かんばんフィルタと auto-label-triage の適用除外判定が機械的になる
B. 新設しない — タイトル/本文の record リンクで識別
X. Other (please specify)

[Answer]: A(intent-mirror ラベルを新設し create が付与)— 2026-07-17T13:01:49Z, Mode: guided
