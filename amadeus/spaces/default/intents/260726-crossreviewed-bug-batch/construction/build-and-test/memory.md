<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-26T11:05:00Z — 成果物正本名は engine directive の build-test-results.md(cid:build-and-test:c1-engine-directive-results-name)。性能・セキュリティは比例選定(承認 NFR trace 分のみ、依存監査は依存変更ゼロにつき別判定・不実施を明記 — cid:bt-proportional-selection / c1-doctor-seam)。
- 2026-07-26T11:05:00Z — フルゲート fresh 実測: typecheck/lint/dist:check/promote:self:check/--ci 全 PASS(563ファイル/0 failed、ALL-GATES-EXIT=0、ログ scratchpad/bt-full-gates.log)。verdict は検証済み面と未検証面を書き分け(#1525 ゲートフレークは本バッチ外の既知残リスク — cid:bt-c4-conditional-ready の書き分け準拠、ただし本バッチ自体は無条件 READY)。
- 2026-07-26T11:05:00Z — required-sections 初回 FAILED 4件(instructions 系の H2 不足)→ H2 構造追加で全 PASSED(機械確認 2/2/2/2)。§13 学習候補は code-generation diary 記載の2件+0件(B&T 固有は新規なし)。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
