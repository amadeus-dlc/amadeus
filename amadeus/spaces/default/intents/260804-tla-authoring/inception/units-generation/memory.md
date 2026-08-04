<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-04T17:15:00Z — user-stories SKIP のため story map を FR/AC 単位の要求対応マップとして実施した; stage protocol の documented fallback（SKIP producer の成果物は設計どおりの欠落）に従い、要求の正本 requirements.md を対応単位にした

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-04T17:15:00Z — U1（基盤 unit）は FR の主担当を持たないが独立 unit として切った; identity/evidence 語彙の単一所有（書き手単一化）が 5 FR の補助前提であり、他 unit へ混ぜると二重実装リスクが戻るため
- 2026-08-04T17:15:00Z — plugin.json に U2（advisory code 宣言）と U6（manifest 修復）の 2 unit が触れる重複を許容した; 加算的な別セクションで衝突せず、どちらかへ寄せると unit の凝集が壊れるため

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
