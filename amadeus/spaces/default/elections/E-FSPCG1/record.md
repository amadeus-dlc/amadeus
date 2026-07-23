# Election Record — E-FSPCG1

- question: intent 260723-fixture-shard-pollution(#1389)/ code-generation の申告付き逸脱裁定(候補 verbatim 正本 = e4 ブランチの <record>/construction/fix-1389-shard-pollution/code-generation/deviation-candidates.md — git show で実測可。builder 申告 verbatim は code-summary.md 申告節)。注意: 起草 conductor の推奨は blind 原則により本配信では伏せる — 各自一次資料から独立判断を。逸脱1: projectDir 配送方式 — plan の emit() 引数貫通に対し、builder は到達困難な内部エラー経路56箇所超の patch 未被覆(lcov 実測)が NFR-4 と非両立と申告し、module-scoped _handlerProjectDir 方式(既存再入ガード idiom)で実装。FR-1 字義は充足済み・ERROR_LOGGED 契約は維持。 各自 lcov 実測・diff・申告 verbatim を確認のうえ、受容度併記+GoA 付きで投票。

裁定: A. 承認(現実装維持)— plan.md へ追記整合のみ(choice 1: 3票)
内訳: choice1=3票 choice2=0票 choice3=0票
- 留保(e1, GoA2): プロセス面の記録: 本逸脱は実装後の申告→選挙であり、cid:deviation-stop-before-implement(実装前停止→選挙が正、実装+申告は前例化しない)の違反実例として PM 回付すること。技術裁定 A の承認はこのプロセス実例の免罪ではない
票タイムライン: 配信 2026-07-23T04:09:14Z → 配信 2026-07-23T04:09:14Z → 配信 2026-07-23T04:09:14Z → e6 2026-07-23T04:10:12Z(受理 2026-07-23T04:10:32Z) → e1 2026-07-23T04:10:40Z → e5 2026-07-23T04:12:37Z(受理 2026-07-23T04:12:59Z) → 開票 2026-07-23T04:12:59Z
GoA[E-FSPCG1]: 1x2 2x1 3x0 4x0 5x0 6x0 7x0 8x0
