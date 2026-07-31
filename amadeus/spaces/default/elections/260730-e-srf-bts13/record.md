# Election Record — E-SRF-BTS13

- question: intent 260730-skill-reviewer-fixes / build-and-test の §13 学習選定。候補3件(diary: construction/build-and-test/memory.md):

[c1] FR-2f 暫定ノルム回収 — #1711 修正(PR #1760)の main 着地により、project.md cid:code-generation:degrade-scope-unit-dir-layout の E-TPRCGS13 追補が定める「conductor が実 unit 名で directive を手動解決して §12a scope へ渡す」暫定手順は不要化した。persist 候補文(同 cid への追補): 「追補2(E-SRF-BTS13 2026-07-30): #1711 修正着地(PR #1760、unitDirsUnderConstruction による engine 側解決+fail-closed)により、degrade スコープの directive は engine が解決済みで emit する — E-TPRCGS13 追補の conductor 手動解決は修正着地後の環境では不要。手動解決が再び必要になった場合は退行として扱い Issue 起票する」。着地は origin/main の grep で実測可能。

[c2] 比例選定 N/A の再判定条件明記(既存 bt-proportional-selection の実践)。

[c3] H2 floor 初回 FAILED→是正(既存様式規範の実践)。

問い: persist する採用集合。c1 の実在根拠(origin/main に unitDirsUnderConstruction が存在、PR #1760 MERGED、#1711 CLOSED)と既存 cid 原文を確認して投票せよ。

裁定: c1 のみ採用 — degrade-scope-unit-dir-layout cid への追補として project 層へ persist(暫定手順の失効を明文化)(choice 1: 2票)
内訳: choice1=2票 choice2=0票 choice3=0票
票タイムライン: 配信 2026-07-30T15:00:54Z → 配信 2026-07-30T15:00:54Z → subagent-1 2026-07-30T15:02:09Z(受理 2026-07-30T15:02:28Z) → subagent-2 2026-07-30T15:02:41Z(受理 2026-07-30T15:02:45Z) → 開票 2026-07-30T15:02:50Z
GoA[E-SRF-BTS13]: 1x2 2x0 3x0 4x0 5x0 6x0 7x0 8x0
