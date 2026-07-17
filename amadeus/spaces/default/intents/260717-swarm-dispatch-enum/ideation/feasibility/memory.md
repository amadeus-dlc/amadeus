<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

> Upstream: [`intent-statement.md`](../intent-capture/intent-statement.md)

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-07-17T22:00:17Z — Codex native subagent の並列 spawn と結果回収は、同一セッションで三つの `ultra` 指定 probe を同時実行して成立した。effort 指定は API に受理されたが、実際に honor された値を示す telemetry は観測できないため、受理と実適用を分けて扱う。
- 2026-07-17T22:00:17Z — PR #1183 は active workflow が使う `.codex/tools/amadeus-state.ts` を変更していたため影響ありと判断し、`origin/main` の `cf7b75b4` へ rebase した。swarm 関連面との直接重複はなく、Intent 成果物と状態は衝突なく復元された。
- 2026-07-17T22:01:28Z — Q1〜Q6 の A と Q7 の Conditional GO がユーザー承認された。AWS・追加規制・組織 blocker はなく、prepared Bolt worktree の隔離書き込みを Requirements 確約前の hard stop とする。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-07-17T22:00:17Z — `codex-ultra` を直ちに不成立とする案より、API による `ultra` 指定受理を現在の証拠限界として明記する Conditional GO を候補とした。prepared Bolt worktree への隔離書き込みが成立しない場合は代替へ黙って降格せず、Requirements 確約前に停止する。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-07-17T22:00:17Z — native subagent が `amadeus-swarm prepare` で作られた unit 別 worktree へ、sandbox の writable-root 境界を越えず隔離書き込みできるかは未実測。Requirements で floor を確約する前に証拠が必要である。
