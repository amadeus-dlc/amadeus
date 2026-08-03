# Election Record — E-RRP-RES13

- question: 260802-record-roundtrip-pbt / reverse-engineering §13 学習選定。surface 候補2件: c1 = cid:reverse-engineering:c1-xrev-scan-mode(バグバッチ向け)を単発のクロスレビュー済み enhancement Issue #1980 へ適用(レビュー2名 verdict を一次入力+conductor verbatim スポット再実測+患部10パス区間 touch 判定で二重化、行シフト再解決表で免除条件充足)/ c2 = observed commit に origin/main tip でなく merge-base(HEAD, origin/main)=9750f8aea を採用(cid:reverse-engineering:c2-observed-mainline-commit の字義充足)。各候補が (a) 既存 cid の単なる執行実例(persist 不要)か (b) 既存 cid の適用範囲を広げる追補(persist 相当)かを、diary 原文・cid 原文(project.md § Corrections)・re-scans/260802-record-roundtrip-pbt.md を実測して判定し、採用集合を選ぶこと。GoA(1-8)を票に明記。

裁定: c1 のみ採用 — xrev-scan-mode の enhancement 単発 Issue 面を既存 cid への追補として persist、c2 は執行実例(choice 2: 2票)
内訳: choice1=0票 choice2=2票 choice3=0票 choice4=0票
- 留保(subagent-1, GoA2): 追補は『クロスレビュー2名成立済みかつ verdict が検証 SHA と file:line を明記している単発 Issue(bug/enhancement を問わない)』へ適用範囲を限定し、免除条件は E-OBB5-RES13 既定のまま(review 対象 SHA ≠ observed のときは全引用を再解決)と明記すること。
- 留保(subagent-2, GoA2): persist 文は diary の「免除条件は行シフト再解決表の作成で充足」という記述でなく re-scan 成果物の実測記載(「行番号再解決の免除条件は適用しない — 患部の一部が区間内 touch を持つため全引用を observed で再解決した」)を根拠とし、c1 の新規性は免除条件の充足ではなく xrev scan mode の適用対象をバグバッチから単発のクロスレビュー済み enhancement Issue へ広げた点に限定して書くこと。
票タイムライン: subagent-1 2026-08-03T00:00:00Z(受理 2026-08-02T16:46:30Z) → subagent-2 2026-08-03T00:00:00Z(受理 2026-08-02T16:46:40Z) → 配信 2026-08-02T16:55:58Z → 配信 2026-08-02T16:55:58Z → 開票 2026-08-02T16:56:02Z
GoA[E-RRP-RES13]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
