<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-18T12:57:04Z — 適用性判定で「pinned implPath を触ったか」だけでなく「モデルの語彙と名前付き不変量に当該 subject が現れるか」を根拠にした。ステージ本文が禁じる『モデルが既にあるから impl-only』という推論を避けるため、0-hit の語彙 probe に加えて両モデルの namedInvariants を列挙し、swarm dispatch も outcome supersession も守備範囲外であることを示した
- 2026-08-18T12:57:04Z — 本 intent の build-and-test で記録した学習(対照リテラルなしの 0-hit を不在の根拠にしない)を同一セッション内で適用した。PrConvergenceGate.tla は被検 8 語すべてが 0 hit だったため、実在既知の対照 VARIABLES / Init / Next を同一述語で走らせ各 2 hit・exit 0 を確認してから 0-hit を採用した

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-18T12:57:04Z — なし

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-18T12:57:04Z — author-new を採らない判断の根拠を、ステージ本文の選定基準(並行・再開可能アクター + 無音の安全性違反)だけでなく team.md § Testing Posture の『並行プロトコルの spec 変更時のみ』へも当てた。FR-2837-1 の再進入面は選定基準に文言上は該当するが、閉じ方が fail-closed の emit 拒否で状態・遷移を追加しないため spec 変更に当たらないと整理した

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-18T12:57:04Z — 直列着地時の再 resync: 2 PR が同じ pinned implPath を変更するため、先行着地後に後続を rebase した時点で digest が変わり updateModelMap --impl-only の再実行が要る。pr-convergence / merge group の CI で SOURCE_DRIFT として顕在化するため、後続 PR の rebase 手順に含める
