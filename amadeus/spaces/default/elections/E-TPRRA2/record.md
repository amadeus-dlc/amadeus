# Election Record — E-TPRRA2

- question: intent 260722-teamup-prompt-race / requirements-analysis の明確化質問(起草 verbatim は e1 worktree の inception/requirements-analysis/requirements-analysis-questions.md — リードオンリー実測可)。既決照合済みの前提: 修正方向=watcher attach 検証+再送 / 検証 seam=agmsg ready センチネル(lib/actas-lock.sh:69-73) / 再送手段=herdr 2段(cid:herdr-send-submit-two-step) / リグレッションテスト必須。 Q2. ready 待ちタイムアウトと再送回数の規定値(cid:constants-from-code)。実測: spawn.sh:132 READY_TIMEOUT=90(:47 default 90 / timeout 時 exit 3)、ack ノルム再送上限2回。 各自コード・Issue #1384 を実測確認のうえ GoA 付きで投票。

裁定: A. 90秒×再送最大2回 — 既存定数の再利用のみ(choice 1: 3票)
内訳: choice1=3票 choice2=0票 choice3=0票 choice4=0票
- 留保(e4, GoA2): 本番実測(#1384 回避策)では再送1回で全員復旧しており上限2回は保守側だが、ack ノルムの既存上限と整合し害はない。
- 留保(e3, GoA2): 90秒の意味論(全体予算か試行ごとか)は design 段で spawn.sh:132 の per-wait 意味に揃えて明文化すること。
票タイムライン: 配信 2026-07-22T22:28:17Z → 配信 2026-07-22T22:28:17Z → 配信 2026-07-22T22:28:17Z → e4 2026-07-22T22:29:30Z(受理 2026-07-22T22:29:34Z) → e3 2026-07-22T22:30:15Z(受理 2026-07-22T22:30:19Z) → e5 2026-07-22T22:30:14Z(受理 2026-07-22T22:30:47Z) → 開票 2026-07-22T22:31:01Z
GoA[E-TPRRA2]: 1x1 2x2 3x0 4x0 5x0 6x0 7x0 8x0
