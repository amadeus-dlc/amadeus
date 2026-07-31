# Election Record — E-OBB4-CGS13

- question: 260731-open-bug-batch-4 / code-generation §13学習選定。4 Bolt 並行実装(#1811 PR#1821 / #1800 PR#1820 / #1797 PR#1822 / #1816 PR#1823、全マージ着地・全 §12a READY)完了時の diary 候補4件から persist 対象を選定する。

【候補A(diary c1 由来・採用提案)】cid:code-generation:c1-degrade-batch-directive-capture への追補 — degrade intent の複数 Bolt は「実装 = worktree 隔離の並行ディスパッチ(FR 全文焼き込み)」と「record 側 = unit dir 作成→directive 捕捉→成果物書込→§12a の uncovered-unique 直列処理(builder 完了順)」の分離で運用できる。PR 発行報告の割込み優先(E-SRF-CGS13)と併用し 4 Bolt 全着地の実測。既存 cid は単一直列ステップ所有を定めるが並行実装との組合せ運用形は未記載。

【候補B(diary c2/c3 由来・不採用提案)】Bolt D の逸脱停止→auto-solo 選挙 E-OBB4-CG1→FR-4b' 申告付き追記→SendMessage 再開(worktree 再検証指示付き) — 既存 cid(deviation-stop-before-implement / implementation-deviation-election / c2 追補の resume 再掲 / c1-narrow-fix-post-apply-remeasure)の実践実例で新規規範なし。

【候補C(diary c4 由来・不採用提案)】マージ順=完了順・副次起票2件(#1830/#1833) — 運用記録であり一般化可能な規範なし。

各自 diary(construction/code-generation/memory.md)・c1-degrade-batch-directive-capture の現行文面(project.md)・4 unit の code-summary.md を実測して投票。

裁定: 案1: 候補Aのみ採用(c1-degrade-batch-directive-capture への並行運用追補として persist)、B/C 不採用(choice 1: 2票)
内訳: choice1=2票 choice2=0票
- 留保(subagent-2, GoA2): 追補文には既存 cid の「実装開始前に directive 捕捉→捕捉後に実装開始」順序との関係(完了順の record 側直列処理は FR 全文焼き込み前提の許容代替形であること)を明示し、同一 cid 内の矛盾読みを残さないこと。
- 留保(subagent-1, GoA2): 追補は既存 cid の順序規定(『並行 Bolt の実装自体は保存済み directive の取得後に開始』)との関係を明文化し、FR 全文焼き込み時は directive 捕捉を完了順の record 側処理へ後置してよい条件形として書くこと。
票タイムライン: 配信 2026-07-31T07:50:41Z → 配信 2026-07-31T07:50:41Z → subagent-2 2026-07-31T07:52:11Z(受理 2026-07-31T07:52:37Z) → subagent-1 2026-07-31T07:51:47Z(受理 2026-07-31T07:52:40Z) → 開票 2026-07-31T07:53:03Z
GoA[E-OBB4-CGS13]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
