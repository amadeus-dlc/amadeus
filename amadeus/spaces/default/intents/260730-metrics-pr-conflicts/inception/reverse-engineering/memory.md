<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-30T10:58:34Z — metrics PR 滞留を snapshot データと可変 projection/retention の責務衝突として読む; main commit ごとの観測履歴を維持するため、単純な latest-only 集約ではなく append-only JSON と単一 maintenance 経路の分離を重点スキャンする。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-30T10:58:34Z — trunk は fetch のみに留め、detached worktree へ統合しなかった; HEAD と origin/main は 2/29 commits で分岐しているが、対象 metrics 実装の差分はゼロで、未コミットの Intent 記録を保護するため現在 HEAD を観測点とする。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-30T10:58:34Z — per-SHA PR 方式自体は履歴完全性のため維持候補とする; 共通 `metrics/index.html` と retention 削除を各 PR から外すほうが、マージ待機ポーリングや自動 rebase ループより競合面と運用複雑性を小さくできる。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
