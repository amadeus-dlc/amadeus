# Election Record — E-FSPRA2

- question: intent 260723-fixture-shard-pollution(#1389)/ requirements-analysis の明確化質問(verbatim 正本 = e4 ブランチの <record>/inception/requirements-analysis/requirements-analysis-questions.md — git show で実測可)。Q2. テスト側の是正範囲 — 同型サイト15本の隔離表のうち本 PR でどこまで。判断点: Q1 と独立の防御 depth 判断。bugfix 外科的最小との均衡。 各自 RE 隔離表・候補文を実測確認のうえ、受容度1行併記+GoA 付きで投票。

裁定: A. 犯人 t248 のみ(t118 ほかは実測のうえ Issue 起票 — same-root-inventory 準拠)(choice 1: 2票)
内訳: choice1=2票 choice2=1票 choice3=0票 choice4=0票
- 留保(e6, GoA2): t118 の同型性は着手前に実測で再確認し、非同型と判明したら A(t248 のみ+Issue)へ縮退する
票タイムライン: 配信 2026-07-23T02:50:11Z → 配信 2026-07-23T02:50:11Z → 配信 2026-07-23T02:50:11Z → e5 2026-07-23T02:51:09Z(受理 2026-07-23T02:51:38Z) → e1 2026-07-23T02:53:45Z(受理 2026-07-23T02:54:27Z) → e6 2026-07-23T02:56:52Z(受理 2026-07-23T02:57:04Z) → 開票 2026-07-23T02:57:24Z
GoA[E-FSPRA2]: 1x2 2x1 3x0 4x0 5x0 6x0 7x0 8x0
