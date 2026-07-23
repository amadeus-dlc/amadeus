# Requirements Analysis — 明確化質問(260723-fixture-shard-pollution / #1389)

上流入力(consumes 全数): business-overview、architecture、code-structure。Q1 の候補(根/増幅)は architecture current view の2段複合欠陥(recordEngineError 非対称+_cloneId メモ化)から、Q2 の候補集合は code-structure の同型サイト15本隔離表から、それぞれ導出している(business-overview はバグ面の利用者影響の確認に参照)。

> **選挙不要判定(E-OC1 / cid:no-election-judgment-gate)**: 欠陥事実(recordEngineError の projectDir 引数欠落 = symmetric-pair 逸脱、_cloneId プロセスメモ化の projectDir 非依存)・犯人テスト(t248:507-527)・回帰テスト必須(org.md bugfix 既定)・dist/self-install 同期必須(project.md Mandated)は RE 実測+既決規範からの機械的導出であり質問化しない。**Q1/Q2 は真の未決(修正対象集合・是正範囲の価値判断)であり選挙対象** — 裁定受領後にのみ [Answer] 記入(cid:election-answer-after-ruling)。
> **判定申告**: 2026-07-23T02:48:04Z(agmsg e4→leader、送信タイムスタンプは agmsg 一次記録が正)
> **leader 承認**: 2026-07-23T02:50:10Z(agmsg 一次記録 — E-OC1 判定4点の承認、Q1/Q2 は選挙配信)

## Q1. 修正対象集合 — 根と増幅のどこまでを本 intent で直すか?【選挙対象】

- A. 両方 — 根(recordEngineError の projectDir 引数化 = emitError :5879 との symmetric-pair 回復)+増幅(_cloneId メモ化の projectDir キー化)
- B. 根のみ — recordEngineError の引数化。_cloneId キー化は Issue 起票で別送(犯人 t248 は根の修正だけで閉包する)
- C. 増幅のみ+テスト隔離(コア変更を避け、fixture 側の CLAUDE_PROJECT_DIR 強制 override で封じる — Issue 本文の当初期待)
- X. Other (please specify)

根拠種別: 真の未決 — RE 申し送り事項2(Architect 設計所見は A 寄りだが「根のみで犯人は閉包」も事実)。エンジン正本(packages/framework/core/tools/)を触る範囲の価値判断

## Q2. テスト側の是正範囲 — 同型サイト15本の隔離表のうちどこまで本 PR で是正するか?【選挙対象】

- A. 犯人 t248 のみ env 隔離を追加(同型潜在 t118:378・要確認3本は実測のうえ Issue 起票 — cid:same-root-inventory 準拠)
- B. 犯人+同型潜在 t118 を同一 PR で隔離(要確認3本は Issue)
- C. 非隔離5本すべてを同一 PR で隔離(スコープ拡大)
- X. Other (please specify)

根拠種別: 真の未決 — Q1 の裁定と独立(コア修正が入っても入らなくてもテスト隔離の防御 depth は別判断)。bugfix 外科的最小との均衡

[Answer]: Q1 = A(E-FSPRA1 裁定 2026-07-23T02:57:24Z 開票、3-0)
[Answer]: Q2 = A(E-FSPRA2 裁定 2026-07-23T02:57:24Z 開票、2-1)

## 裁定の記録

- **E-FSPRA1(Q1)**: A 採用 3-0(choice1=3)。GoA 1x1 2x2。留保必須票2件 → FR-1 へ verbatim 転記済み([e1]・[e6])。leader E-OC1 承認: 2026-07-23T02:57:49Z(agmsg 一次記録)
- **E-FSPRA2(Q2)**: A 採用 2-1(choice1=2 / choice2=1)。GoA 1x2 2x1。留保必須票1件(e6、B 票側)→ FR-2 へ verbatim 転記済み。e5 の A 根拠(t118 未実測の同乗は実測起票規律に反する)も FR-2 注記へ転記
- 票タイムライン(両選挙共通): 配信 2026-07-23T02:50:11Z → e5 02:51:09Z(受理 02:51:38Z) → e1 02:53:45Z(受理 02:54:27Z) → e6 02:56:52Z(受理 02:57:04Z) → 開票 02:57:24Z
