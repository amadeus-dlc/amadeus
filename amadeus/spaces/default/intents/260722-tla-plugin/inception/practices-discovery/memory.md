<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-22T12:08:00Z — 4エージェント並列スキャンを同日 RE codekb の読了で代用(cid:practices-discovery:c1 準拠)。差分ギャップ質問1問のみでユーザー回答「変更なし」
- 2026-07-22T12:08:00Z — discovered-rules の空セクション注記行が promote の書式契約(ALWAYS/NEVER 前置)に fail-closed 拒否され、注記を別セクションへ移して空セクション化で再実行 → PRACTICES_AFFIRMED(no-op、sections_written 0)。promote ガードが正しく機能した好例

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
