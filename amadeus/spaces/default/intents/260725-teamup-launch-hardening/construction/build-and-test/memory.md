<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-07-26T00:15Z — RAID の「resume 時の actas ロック残存」は**リスクが実在しなかった**と確定。bench5 撤去後に残った4件のロックで実測: 所有 PID は全て DEAD、`actas_lock_gc_stale` が `reclaimed=4` を返し残留 0。この GC は `session-start.sh:171` が毎回呼ぶ既存機構であり、本 intent の変更を要しない。
- 2026-07-26T00:15Z — ユニット層へのテスト追加をしないことを層の選択として明記した（`cid:build-and-test:wtfbt-c1`）。変更対象がシェル関数・tmux・実 FS 境界で純関数層を持たないため。検証の省略と読まれないよう成果物に理由を書いた。
## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-07-26T00:10Z — full CI が `wall-clock drift` 警告を1件出した（`t-codex-hooks-migration.test.ts` declared=medium / measured=large 36.45秒）。blame で最終変更が `bf84cdfaf`(#1212) と確定し本 intent 由来でないため、`RESULT: PASS` を妨げないことを確認のうえスコープ外とした。ただし `project.md` Forbidden（既存の赤を無視しない）に従い成果物へ明示的にフラグして引き継いだ。
## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-07-26T00:15Z — build-and-test の verdict を無条件 READY でなく「条件付き READY」とした。起動経路は完全に検証したが R-3（actas の配送）は未検証で、起動の成立を配送の成立へ昇格させないため（`cid:reverse-engineering:seam-feasibility-multi-facet`）。
## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-07-26T00:15Z — R-3（actas の受信範囲制限が配送を壊さないか）は本 intent では検証しない。7人起動の成功は watcher が arm された証拠だが配送の証拠ではない。#1476 の実運用投入時に別途要検証。