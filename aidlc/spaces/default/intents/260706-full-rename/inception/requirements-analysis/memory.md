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
- 2026-07-06T04:12:00Z — Interpretation: /aidlc の新名は /amadeus とした（Q2。公開 skill 名との一致が根拠。確定判断は「rename する」のみで新名の明示がないため、gate で人間確認を受ける）。
- 2026-07-06T04:12:00Z — Interpretation: 内部マーカー（.aidlc-*）と examples を範囲に含めた（Q3/Q4。確定判断の「一貫性優先」の帰結として。これも gate 確認対象）。
- 2026-07-06T04:12:00Z — Tradeoff: parity-baseline は不変（上流実体は変わらない）で、nameMappings の拡張だけで写像後 byte 一致を維持する方針（FR-5）。例外維持中のエンジンファイルは写像が効かないため手動 rename が必要になる点を code-generation へ引き継ぐ。
- 2026-07-06T04:20:00Z — Interpretation: reviewer READY（iteration 1/2、所見 4 件 = 非ブロッキング）。所見 1（.gitignore を FR-1 の明示リストへ）、所見 2（106 は参考実測値で作業基準は全表記 + fresh 再走査）、所見 4（AC-6 の検証手段明示）を反映。所見 3（FR-4/FR-9 の gate 確定注記）は gate 通過後に追記する。
