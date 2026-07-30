# Election Record — E-OBB2-RES13

- question: intent 260730-open-bug-batch-2 / reverse-engineering の §13 学習選定。候補2件(diary: inception/reverse-engineering/memory.md):

[c1] 対象バグの1件(#1742)に別セッションの修正 PR #1758 が既に存在すると判明し、Bolt 編成を「再実装→PR 収束の引き取り」へ変更、交差 Bolt(#1750)を直列化した。バグ batch intent の起動時に、対象 Issue ごとの既存 open PR の有無を gh pr list --search で棚卸しする定型手順は既存ノルムに無い(pre-filing-dup-and-branch-check は起票時の重複検査であり、着手時の既存 PR 検査ではない)。persist 候補文: 「バグ修正 intent の起動時(RE/RA 前)に、対象 Issue ごとに既存 open PR の有無を gh pr list --search '<issue番号> in:body' 等で棚卸しし、既存 PR がある Issue は再実装でなく当該 PR の収束・レビュー・承認マージへ Bolt を編成し、他 Bolt との交差判定に当該 PR の変更ファイルを含める」。

[c2] 前回・前々回 observed がいずれも HEAD 非祖先 → merge-base を base に採用(既存 rescan-base-ancestry の実践 — 新規性は薄いが、「ローカル merge コミットを observed に記録すると次回必ず非祖先化する」という原因側の知見は追補価値がありうる: observed には HEAD でなく origin/main 系譜のコミットを記録する、という書き手側規律)。

問い: persist する採用集合。実在根拠(PR #1758 の存在、timestamp の observed 系譜)を実測確認して投票せよ。

裁定: c1+c2 採用(c2 は rescan-base-ancestry への「observed は origin/main 系譜で記録する」追補として)(choice 2: 2票)
内訳: choice1=0票 choice2=2票 choice3=0票
- 留保(subagent-1, GoA2): c2 の追補文言は『HEAD 祖先であること』ではなく『origin/main の祖先であるコミット(または merge-base)を observed に記録する』と書くこと。実測では現 observed c42ef4d77 は HEAD 祖先(exit 0)だが origin/main には未達(NOT-IN-ORIGIN-MAIN)であり、HEAD 祖先性だけを書き手側基準にすると同じ失敗が次回も再現する。また c2 は独立 cid を新設せず rescan-base-ancestry への追補として統合し、c1 は priority-vs-dependency (3)(進行中 PR と同層の修正は着地待ちか非交差実測)との重複を避けて『発見手順(着手時の gh pr list 棚卸し)と Bolt 形状(再実装でなく収束)』の面に限定して書くこと。
票タイムライン: 配信 2026-07-30T15:44:20Z → 配信 2026-07-30T15:44:20Z → subagent-2 2026-07-30T15:45:44Z(受理 2026-07-30T15:46:09Z) → subagent-1 2026-07-30T15:46:34Z(受理 2026-07-30T15:46:39Z) → 開票 2026-07-30T15:46:41Z
GoA[E-OBB2-RES13]: 1x1 2x1 3x0 4x0 5x0 6x0 7x0 8x0
