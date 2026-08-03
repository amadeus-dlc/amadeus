<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-02T18:34:32Z — upstream 様式を採用しつつ新規 producer 契約を required に強化する; upstream `831bd29` は `kind` を optional とするが、Issue #2019 の承認済み方針は新規 units-generation 成果物での欠落を gate で拒否する。既存 record の `kind?` と full-matrix fallback は互換境界として維持する。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-08-02T18:34:58Z — `answer-evidence` は RE の9成果物へ適用不能だった; manifest の `matches: "**/*-questions.md"` により9件すべて matches-rejection となった。質問成果物を持たない本ステージでは不発を成功扱いせず、`required-sections` と `upstream-coverage` の各9件 pass、質問ファイル不在、H2数、引用、conflict marker、`git diff --check` を代替証拠とした。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-08-02T18:34:32Z — `tech-stack-decisions` optional 化を最小 self-fix から分離する; 同時実施すると library の必須成果物数と NFR Design の required consume 契約が変わり、producer-side kind 配線の修復を越えて変更面が拡大する。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-08-02T18:34:32Z — NFR Design の required consumes 非対称を Requirements Analysis で裁定する; library の upstream pruning 後に欠ける performance/scalability/reliability requirements を expected absence として扱うか、consume 側を kind-aware にするかを normal-path characterization で確定する。
