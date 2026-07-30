# Election Record — E-SRF-CGS13

- question: intent 260730-skill-reviewer-fixes / code-generation の §13 学習選定。候補4件(diary: amadeus/spaces/default/intents/260730-skill-reviewer-fixes/construction/code-generation/memory.md):

[c1] Bolt 2 実装の機構記録(unitDirsUnderConstruction の slug 減算、fail-closed、allowlist 38 remap、§12a 両 unit READY)— intent 固有の実装事実。

[c2] .codex scope-grid キー順 churn(#1734 既知)の PR 同乗を Bolt 1/2 とも surgical 基準で除外 — 既存 N-1/既知バグの実践。

[c3] builder subagent が実装コミット後・配送(push/PR/報告)前に停止し、conductor が disk-evidence-early-takeover で引き取り — 既存 cid(spawned-agent-result-delivery / disk-evidence-early-takeover)の再演。

[c4] 並行 Bolt 実行中、builder の PR 発行報告がディスクに実在したのに他 Bolt の完了同期待ちへ先に入り、merge-ready PR の処理がユーザー指摘まで遅延した。既存 norm(resource-efficiency / merge-approval-latency)は「承認待ちを直列化点にしない」ことは定めるが、「PR 発行報告の受領を他 Bolt 完了待ちより先に処理する割込みイベントとして扱う」conductor スケジューリング規則は未明文 — persist 候補文: 「並行 Bolt 中、builder の PR 発行報告(報告ファイル/PR URL の出現)を受領したら、他 Bolt の完了待ちに入る前に当該 PR の収束確認と承認伺いを処理する。完了待ちの同期ループは未処理の PR 発行報告が無いことを確認してから張る」。

問い: persist する採用集合。判断材料: c1〜c3 は intent record/既存 cid で足りるか。c4 は既存 norm との重複か真の隙間か — diary の実測(ユーザー指摘で発覚)と既存 cid 原文を確認して投票せよ。

裁定: c4 のみ採用 — 上記候補文を project 層 Corrections へ persist(conductor スケジューリングの割込み規則として新規)(choice 2: 2票)
内訳: choice1=0票 choice2=2票 choice3=0票
- 留保(subagent-2, GoA2): persist 文は独立規則として書かず、cid:code-generation:disk-evidence-early-takeover への追補として『並行 Bolt 中の conductor スケジューリング』に適用範囲を限定して書く — 両者は『ディスク上の実在証拠を待機ループより優先する』同一ファミリであり、無限定の独立規則にすると『任意の報告が任意の待機に割り込む』へ過剰一般化する。
- 留保(subagent-1, GoA2): 適用対象を「builder の PR 発行報告(報告ファイルの実在・PR URL の出現)」に限定し、一般の進捗報告・中間報告全般への割込み処理義務へ拡大しないことを persist 文に明記すること。
票タイムライン: 配信 2026-07-30T14:28:23Z → 配信 2026-07-30T14:28:23Z → subagent-2 2026-07-30T14:29:48Z → subagent-1 2026-07-30T14:29:48Z(受理 2026-07-30T14:29:53Z) → 開票 2026-07-30T14:30:06Z
GoA[E-SRF-CGS13]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
