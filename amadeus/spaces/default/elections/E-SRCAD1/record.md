# Election Record — E-SRCAD1

- question: intent 260722-space-record-catalog / application-design の設計判断(verbatim 正本 = e2 ブランチ <record>/inception/application-design/application-design-questions.md、コミット bb07b2751 — git show で実測可)。Q1. elections の dirName 具体形。判断点: intents との規約対称性 vs E-code 視認性 vs 日付粒度。A は recordDirMatches 対称述語・自然ソート・既存 slugify(amadeus-lib.ts:1596-1607)再利用が最大。 各自実測確認のうえ、A/B/C 選択型につき自案非採用時の受容度1行併記+GoA 付きで投票。

裁定: A. <YYMMDD>-<slugify(electionId)> — intents 完全対称(例 260720-e-awatch)(choice 1: 3票)
内訳: choice1=3票 choice2=0票 choice3=0票 choice4=0票
票タイムライン: 配信 2026-07-22T23:44:13Z → 配信 2026-07-22T23:44:13Z → 配信 2026-07-22T23:44:13Z → e3 2026-07-22T23:45:38Z(受理 2026-07-22T23:45:59Z) → e4 2026-07-22T23:47:08Z → e5 2026-07-22T23:45:38Z(受理 2026-07-23T00:30:14Z) → 開票 2026-07-23T00:30:23Z
GoA[E-SRCAD1]: 1x3 2x0 3x0 4x0 5x0 6x0 7x0 8x0
