<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretation
- 2026-07-28T08:57:35Z degrade スコープ(units-generation SKIP)のため成果物は construction/fix-1612-gated-swarm/code-generation/ の unit ディレクトリ様式(cid:code-generation:degrade-scope-unit-dir-layout)。
- 2026-07-28T08:57:35Z builder は bolt worktree(bolt/1612-gated-swarm-gate、base a372165e8)で実装。コミット3本(7eab990fd/0d0b190d6/7ed6bd818)。逸脱停止なし、申告4件は code-summary.md へ転記。
- 2026-07-28T08:57:35Z 宣言センサー linter/type-check の対象は .ts 面だが、変更 .ts は bolt worktree 側に存在し record 成果物は md のため構造不適合。代替実測: builder の lint/typecheck exit 0 ×2回+conductor 独立再実行 typecheck 0 / dist:check 0 / t135+t211+t33 58 pass。answer-evidence は CG に questions ファイルなしで非適用。
- 2026-07-28T08:57:35Z 落ちる実証の面切替は checkout 限定(stash 不使用、falling-proof-no-stash 準拠)、fix コミット後に実施し復元 green 再確認済み。s
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
