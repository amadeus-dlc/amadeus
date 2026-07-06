<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T07:11:16Z — FR-1 の regex 修正は 3 本（transition tool / orchestrate report / runtime 再帰ガード）すべてへ同じ path alternation（.claude/.kiro/.codex + .agents/amadeus）を適用した。再帰ガードにも適用しないと、.agents 経由の compile 呼び出しが transition 扱いになり無限再帰の芽になるため。
- 2026-07-06T07:11:16Z — FR-2 の自己修復は readRuntimeStageRow（surface 専用の解決関数）に実装した。graph 不在・malformed・slug 不在をすべて null に畳み、1 回だけ再 compile して再解決する。compile は決定論・冪等なので冗長実行は無害。
- 2026-07-06T07:11:16Z — e2e ケース (b) は「audit shard を STAGE_STARTED を含まない本文へ置換」で作った。再 compile 自体は成功するが current slug の row が graph に載らない = 自己修復が尽きるフォールバック経路を決定論的に踏む。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-06T07:11:16Z — FR-2 実装が e2e ケース追加より先行したため、遡及 RED（learnings 変更を git stash → #558a が旧エラー（復旧手順なし）で FAIL することを確認 → pop → 全 GREEN）で eval の検出力を証明した（Testing Posture c6 の手順）。hook 側（FR-1）は正順の RED 先行（.agents 経由 2 ケースが実装前 FAIL）。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-06T07:11:16Z — 自己修復の再試行は 1 回に限定した。compile が成功しても slug が載らないのは audit 側の欠落であり、再試行の繰り返しでは解決しない（復旧手順つきエラーで人間へ返すのが正しい）。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
