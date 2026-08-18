<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-18T05:05:00Z — (Deviations/INCIDENT) conductor の audit shard e47eeec11866 を B2 worktree からの還流 cp で誤って古い bundle 断面(728行)に上書きし、直後に HEAD 版(748行、bundle は真部分集合であることを comm で実証)へ復元した。ただし最終 commit(7b9123701)以後の未コミット追記 約74行(CG/B&T/tla の遷移・sensor 行)は復旧源がなく喪失。捏造による再現はしない(P2)。状態の正本(amadeus-state.md チェックボックス)・§13 persist(project.md)・autonomy journal は別ストレージで無傷。seq 連番は 748 行目から単調継続し将来行の整合は保たれる。手順上の根本原因: 還流 sweep で comm(包含検査)の結果が conductor-only=94 と非ゼロだったにも関わらず cp を実行した — sweep は「包含検査が非ゼロなら union 再構成、cp 禁止」を機械条件にすべき(§13 候補)
