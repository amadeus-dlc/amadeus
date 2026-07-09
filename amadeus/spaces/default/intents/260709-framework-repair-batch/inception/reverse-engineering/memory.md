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
- 2026-07-09T07:10:00Z — Interpretation: 既存 codekb(installer-distribution、observed 8510281ae、2026-07-08)を差分ベースに採用し、166コミット分の diff-refresh で実行(project.md cid:reverse-engineering:c1 準拠)
- 2026-07-09T07:10:30Z — Open question: codekb-path が <repo> を worktree ディレクトリ名(claude-leader)から導出するため、同一リポジトリの codekb が amadeus/ installer-distribution/ claude-leader/ に分裂している。space レベル永続ストアの意図と不整合の可能性 — Issue 起票候補
- 2026-07-09T07:18:00Z — Deviation: codekb 分裂の件はユーザー承認のうえ Issue #668 として起票済み(https://github.com/amadeus-dlc/amadeus/issues/668)。本ステージは規約どおり codekb-path の出力(codekb/claude-leader/)へ verbatim に書き込み、統合は Issue 側で扱う
