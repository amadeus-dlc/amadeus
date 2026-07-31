# Election Record — E-OBB2-CGS13

- question: intent 260730-open-bug-batch-2 / code-generation の §13 学習選定。候補1件(diary: construction/code-generation/memory.md):

[c1] 複数 unit を並行 worktree で batch 実装した degrade intent では、build 時に engine 解決 directive を捕捉していないため、全 unit covered 後の §12a で engine emit が裁定 B どおり fail-closed になり、conductor の手動解決 directive が再び必要になった(B&T §13 追補の退行条項に形式該当するが、engine 欠陥ではなく運用ギャップ)。persist 候補文: 「複数 Bolt の degrade intent を並行実装するときは、各 unit の実装開始前に unit dir を1つずつ遅延作成し、その時点の engine 解決 directive(uncovered-unique で当該 unit へ解決される)を record 外 scratch へ保存して §12a で再利用する — 全 unit covered 後の engine emit は設計どおり fail-closed のため、build 時捕捉が唯一の in-band 経路」。

問い: persist するか。実在根拠(diary、E-OBB2-CG1 record、engine の fail-closed 実装)を実測確認して投票せよ。

裁定: c1 を採用 — project 層 Corrections へ persist(degrade batch 実装の directive 捕捉手順)(choice 1 — tie 裁定)
- 留保(subagent-1, GoA2): 0件採用にあたり、本件の再発時に conductor が「未記録の運用ギャップ」と誤認しないよう、当該 intent の diary(construction/code-generation/memory.md:8 Deviations)へ既存 cid:code-generation:degrade-scope-unit-dir-layout(E-TPRCGS13 追補)への参照を1行追記し、解決手順が既決であることを record 側で辿れるようにすることを条件とする。
- 留保(subagent-2, GoA2): c1 の persist にあたり次の2点を条件とする。(1) 独立した新規 Corrections 項として立てず、cid:code-generation:degrade-scope-unit-dir-layout 系(具体的には project.md:269 の cid:build-and-test:c1-degrade-interim-retired)への追補として書き、その退行条項『手動解決が再び必要になった場合は退行として扱い Issue 起票する』の適用範囲を明示的に狭めること — 複数 unit dir が全 covered の degrade batch は amadeus-orchestrate.ts:3015-3018 の設計どおりの fail-closed であり退行ではない(Issue 起票不要)。狭めずに c1 だけを足すと、既存条項と『設計どおりだから起票しない』という c1 の前提が正面から矛盾したまま残る(cid:requirements-analysis:norm-consistency-review)。(2) 『unit dir を1つずつ遅延作成』はディレクトリ作成の順序付けのみを指し、並行 worktree 実装そのものを直列化する指示ではないことを本文に明記すること — 無条件に読むと cid:requirements-analysis:parallel-bolts(1 intent あたり最大4 builder の並行実装)と衝突する。あわせて、保存 directive がセッション再起動・コンテキスト喪失で失われた場合の復旧手段(unit dir 名と node.produces から conductor が手動解決する従来手順)を fallback として1行残すこと — 私自身が E-OBB2-CG1 の票で『保存 directive の再利用はセッション再起動・コンテキスト喪失に対して脆い』と述べた懸念は c1 採用後も消えないため。
票タイムライン: 配信 2026-07-30T21:09:49Z → 配信 2026-07-30T21:09:49Z → subagent-1 2026-07-30T21:11:54Z(受理 2026-07-30T21:12:01Z) → subagent-2 2026-07-30T21:12:45Z(受理 2026-07-30T21:12:50Z) → 開票 2026-07-30T21:12:58Z → 開票 2026-07-30T21:13:05Z
GoA[E-OBB2-CGS13]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0

- hold 裁定履歴: tie → choice:1(2026-07-30T21:57:51Z、復帰先 tallied)
