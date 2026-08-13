<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations

- 2026-08-13T16:46:57Z — performance/security instruction は produces 必須のため、c2-no-test-theatre-for-absent-nfr に従い「N/A 判定 + 根拠 + 覆す条件」を記録する形で作成。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations

- 2026-08-13T16:46:57Z — フルスイート実行中に advisory 対象テストを並行実行して timeout を招いた(coverage-single-owner 違反の自認)。直列再実行で確定値を取得し、以後直列を厳守。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs

- 2026-08-13T16:46:57Z — main 競合(#2975 team-up 削除)の codekb 解消は「新 observed 側を現在・当方節を履歴」の両節保持で再構成(LWW と引用可能性の両立)。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions

- 2026-08-13T16:46:57Z — CI 専用ゲート(coverage 両条件・patch coverage 等)は PR #2980 の必須 CI で確定する — verdict では未検証面として書き分け済み。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
