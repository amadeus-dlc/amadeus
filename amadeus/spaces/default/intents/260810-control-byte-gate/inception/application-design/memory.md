<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-10T10:40:00Z — RA 送付3問を decide-question で裁定(independent-job / in-script / cr-excluded)。ADR-1 により detect-ci-changes.sh は無改修 — 起動指示 (c) の「docs/ を含めるなら分岐追加必須」は、その趣旨(docs-only PR でゲートが走ること)を常時実行ジョブがより強く充足する形で解消。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-08-10T10:40:00Z — decisions.md ADR-3 の CONTROL_CHARS 逐語引用で生制御バイト5個(0x00/0x08/0x0B/0x1F/0x7F、offset 2895-2901)が起草時に実混入 → §13 新ノルム(c4-control-byte-drafting)の書込後バイト走査で検出し、エスケープ表記(\uXXXX)へ是正・再走査 0 件を確認。RE 段の Architect 実事例と同型の2例目 — 本 intent が作るゲートの必要性の追加実証。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
