<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-17T05:50:00Z — inception 各ステージの questions ファイル(AD/UG/DP)が Minimal 上限4問を超過(5問)し、CI の t517 corpus sweep(blocking)で全 PR が赤化。question-budget センサーはステージ実行時 advisory だが、record を PR へ同梱した瞬間に corpus 検査が blocking になる — 起草時に上限内へ収める(質問の統合は [Answer] 単位の裁定 provenance を保てば可)
- 2026-08-17T05:50:00Z — builder が worktree で staged 変更を持つ間に conductor が record sync で `git add + commit` すると builder の差分を巻き込む — record sync は `git commit -- amadeus/` のパス限定が必須(B4 で実発生、内容は検証済みのため squash 前提で許容)
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-08-17T04:50:00Z — B4 の BLOCKER 是正差分が conductor の record sync コミット(397fcd4ed、chore(record) メッセージ)へ同梱された(builder の staged 変更を巻き込む git add/commit 運用ミス)。内容は builder が diff 実読で意図どおりと検証済み・テスト 37 pass。squash 着地で中間メッセージは消えるため履歴修正はしない。以後の record sync は `git commit -- amadeus/` のパス限定で行う
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
