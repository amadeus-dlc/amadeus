# Election Record — E-MPC-CGRV

- question: PR #2414 のレビュースレッド(CodeRabbit、Major・Data Integrity)の disposition 裁定: 「landed な PR への override を拒否せよ — cli.ts:608 で report 以外の verb は override 処理へ進み、landed は verdict.converged=false のため既存の already-converged 拒否を通過する。HUMAN_TURN があればマージ済み PR に audit decision を発行し、landed report を override report(converged:false 恒久)で置換できる」。衝突: requirements の Out of scope は『override 経路…の変更』を明示的に除外し、FD も conductor 起草時に同種の refuse 追加案を Out of scope 違反として自己捕捉・除去した(business-logic-model の verb 表に記録)。一方 pr-convergence stage の triage 境界規則 (i) は『本 PR が触る surface の実在する correctness finding は軸の示唆に関わらず本 PR で修正』と定める。補足実測: override は evaluate 成功(gh 到達)を前提とするため、gh 到達不能時の override 経路は本件 refuse の影響を受けない(到達不能なら evaluate が先に exit 2)— landed 検出可能な状況では landed report が常に代替になる。各投票者は cli.ts の override 経路(:608 付近と already-converged refuse)と requirements Out of scope / FD verb 表を独立実読して投票せよ。

裁定: B: Issue 起票で deferral(スレッドは Issue 番号 cite で terminalise)(choice 2 — tie 裁定)
- 留保(subagent-2, GoA2): 反証コメントには cli.ts の override 型コメント(#2401 参照の意図的許容)・predicate.ts landedVerdict の converged:false 設計根拠・FD verb 表の自己捕捉記録を file:line で cite し、将来 override(converged:false) を landed の上位証拠として消費する consumer が現れた場合は新事実として Issue 起票する条件を1行残すこと。
- 留保(subagent-1, GoA2): 起票する Issue には、独立実測で確定した機序の全体 — override 置換は HUMAN_TURN+reason+audit decision を要する人間裁定行為であり、report verb の再実行(writeReport は unit 固定パスへ landed report を機械再生成)で可逆であること — を明記し、finding の『恒久』表現を訂正したうえで重大度をトリアージすること。
票タイムライン: 配信 2026-08-07T12:40:41Z → 配信 2026-08-07T12:40:41Z → subagent-2 2026-08-07T12:43:46Z → subagent-1 2026-08-07T12:44:01Z → 開票 2026-08-07T12:44:19Z
GoA[E-MPC-CGRV]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0

- hold 裁定履歴: tie → choice:2(2026-08-07T12:47:14Z、復帰先 tallied)
