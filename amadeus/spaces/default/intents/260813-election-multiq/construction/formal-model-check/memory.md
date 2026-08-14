<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-13T11:35:38Z — advisory が指す登録済み FormalElection を相関情報付きで検査した; run-now receipt の対象・spec identity・instance を manifest に固定し、TLC の完全探索で NOT_DETECTED を得た。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-08-13T11:35:38Z — #2967 の回帰で失われた handoff route を explicit single-stage invocation で回復した; 旧 core route の隠し出力親は移設後 runner に OUT_PATH で拒否されたため、ステージ成果物ディレクトリ配下の fresh path を使用した。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
