# Election Record — E-STG-S13

- question: intent 260805-subagent-type-guard / ステージ intent-capture の §13 学習選定。observation diary から surface された候補は5件(c1〜c5)。このうち memory 層(project.md 等)へ persist する採用集合を選べ。判断基準: (i) 一般化可能な規則か、それとも本 intent 固有の判断か (ii) 既存 cid に既に覆われていないか(覆われていれば重複であり不採用) (iii) 実測に接地しているか。各候補の全文は description に逐語で載せる。候補の要旨: c1=Issue-first intent ではクロスレビューを質問起草より先に置いた順序 / c2=既存 cid(intent-capture:c1, requirements-analysis:c5)を適用して質問を絞った旨 / c3=intent 誕生時に active tree が別 intent の陳腐化ブランチにいたため、ステージ本体に入る前に origin/main 起点の新ブランチへ移設した / c4=Q1 の裁定理由(本 intent 固有) / c5=Q2 の裁定理由(本 intent 固有)。

裁定: c3 のみ採用(choice 1: 2票)
内訳: choice1=2票 choice2=0票 choice3=0票
- 留保(subagent-2, GoA2): c3 は独立した新規 cid ではなく cid:code-generation:base-advance-regrounding への追補(intent 誕生時点の base 面)として、branch 名・commit SHA・73 という intent 固有の値を落とした一般形で persist すること — 同 cid には既に c5-ratchet-census-at-final-base という『既存 cid の未被覆面を追補で埋める』先例があり、独立 cid の新設はノルム層の分散を招く。
- 留保(subagent-1, GoA2): c1 の不採用理由は『価値がない』ではなく『既存ノルムに覆われており、かつ現文言のまま persist すると上位ノルムを弱める』である旨を裁定に明記すること — c1 が示した実効(reviewer 実測が Q3/Q4 の選択肢を規定した)は既存の起動前レビュー規範の裏付け実例として intent record 側に保存し、その保存を不採用の条件とする。
票タイムライン: 配信 2026-08-05T13:48:49Z → 配信 2026-08-05T13:48:49Z → subagent-2 2026-08-05T14:05:00Z(受理 2026-08-05T13:51:57Z) → subagent-1 2026-08-05T13:52:00Z(受理 2026-08-05T13:52:23Z) → 開票 2026-08-05T13:52:39Z
GoA[E-STG-S13]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
