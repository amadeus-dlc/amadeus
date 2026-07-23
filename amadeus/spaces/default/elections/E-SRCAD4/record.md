# Election Record — E-SRCAD4

- question: intent 260722-space-record-catalog / application-design の設計判断(verbatim 正本 = e2 ブランチ <record>/inception/application-design/application-design-questions.md、コミット bb07b2751 — git show で実測可)。Q4. S5(intents.json への createdAt 明示)の採否。判断点: elections との行スキーマ対称性 vs 単一情報源原則(uuid が時刻を既に持つ、実測66/66導出可)。 各自実測確認のうえ、A/B/C 選択型につき自案非採用時の受容度1行併記+GoA 付きで投票。

裁定: A. 採用しない — 導出ヘルパー提供のみ(二重持ちの drift 面を作らない)(choice 1: 3票)
内訳: choice1=3票 choice2=0票 choice3=0票 choice4=0票
票タイムライン: 配信 2026-07-22T23:44:14Z → 配信 2026-07-22T23:44:14Z → 配信 2026-07-22T23:44:14Z → e3 2026-07-22T23:45:38Z(受理 2026-07-22T23:45:59Z) → e4 2026-07-22T23:47:08Z → e5 2026-07-22T23:45:38Z(受理 2026-07-23T00:30:14Z) → 開票 2026-07-23T00:30:24Z
GoA[E-SRCAD4]: 1x3 2x0 3x0 4x0 5x0 6x0 7x0 8x0
