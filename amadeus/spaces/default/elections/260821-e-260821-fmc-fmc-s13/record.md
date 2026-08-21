# Election Record
Election ID: E-260821-FMC-FMC-S13
Run ID: run-1
Lifecycle: tallied
Established questions: 1
Hold questions: 0
Held question IDs: none

## Question q-learnings-selection: formal-model-check ステージの §13 学習選定。diary(2026-08-20 の spec-change advisory run-now による明示 single-stage 実行時の記録)から2候補が surface された。conductor の採用案は『0件採用』。候補1: 先行 applicability outcome を持たない explicit run はステージ本文 Step 1 の explicit-run 腕 = 全登録モデル(4本)検査とした — ステージ本文の平易な読解であり新規学習ではない。候補2: CI acceptance 経路はローカルで構造的に ARTIFACT_VERIFY_FAILURE になるため run-model-check.ts の単一モデル経路 ×4 を --out repo外で実行 — 既存ノルム cid:formal-model-check:c2(2026-08-18 学習済み、project.md 実在)の機械適用そのもの。いずれも既存ノルム・本文の適用であり新規記録価値なしとして0件を諮る。
Established: 0件採用でよい(候補1 = 本文の平易読解、候補2 = 既存 cid:formal-model-check:c2 の機械適用) (choice 1)
Choice counts:
- Choice 1 0件採用でよい(候補1 = 本文の平易読解、候補2 = 既存 cid:formal-model-check:c2 の機械適用): 2
- Choice 2 候補1 を採用(explicit-run 腕の解釈をノルム化): 0
- Choice 3 候補2 を採用(c2 への追補が必要): 0
- Choice 4 両方採用: 0
GoA: favor=2 against=0 abstain=0 discuss=0
GoA frequency: 1x1 2x1 3x0 4x0 5x0 6x0 7x0 8x0
Reservations:
- Reservation subagent-2 [original:2026-08-21T01:16:39Z] GoA 2: 候補1は plugins/formal-model-check/stages/formal-model-check.md の frontmatter condition 行(『Explicit single-stage runs check the selected registered model or all registered models.』)に既出で、git log -p --follow で当該行はコミット ba74e9e5d(PR #2477、本 intent 以前)で追加済みと確認した — 平易な読解であり新規学習の価値なし。候補2は project.md:208 の cid:formal-model-check:c2(learned 2026-08-18、本 intent 以前)が --out repo外・run-model-check.ts 単一モデル経路・CI acceptance のローカル ARTIFACT_VERIFY_FAILURE の3点を逐語で被覆済みと確認した — 機械的再適用であり不採用が妥当。両候補とも diary(construction/formal-model-check/memory.md)の記述内容と実測が一致し、0件採用の反証は得られなかった。
Late responses:
- None
Run lineage: run-1

## Timeline
- tallied at=2026-08-21T01:17:03Z run=run-1