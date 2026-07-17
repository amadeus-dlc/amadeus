<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-17T13:39:37Z — raid-log R1(park の機械可読取得)を RE で確定: state.md Runtime State 節の Parked/Parked At Stage 2フィールドが実体、intents.json に痕跡なし; design 段の宿題が前倒しで解消。
- 2026-07-17T13:39:37Z — diff-refresh の base は squash 運用により最新3 observed が非祖先 → 祖先距離最小の 6495e03a(dist=107)を採用(rescan-base-ancestry); codekb 本文は関心 seam 無変更のため全点温存。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-17T13:39:37Z — subagent の最終報告がターン境界配送で回収不能のため、disk-evidence-early-takeover により成果物安定を実測して引き取り(差分検分+再照合7点は architect が実施済み、conductor も scan-notes/re-scans を全読検分)。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-07-17T13:39:37Z — gh CLI 呼び出しは repo 初導入となる(前例なし) — spawn 様式・未認証エラーの設計は requirements/design 段で確定。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
