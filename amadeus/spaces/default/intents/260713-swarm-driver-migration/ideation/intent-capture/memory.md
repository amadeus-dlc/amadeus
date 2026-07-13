<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-13T04:35:08Z — native swarm能力を完了条件として扱う; Claude CodeのAgent Teams・Ultra CodeとCodexのUltraは将来候補ではなく、本Intentで実際に利用可能か検証される必須能力と解釈した。
- 2026-07-13T04:42:27Z — explicit指定を能力保証として扱う; 明示driverは利用不能時に失敗し、別driverで成功扱いにしない。`auto`は環境差を吸収する利便性契約として分離した。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-13T04:42:27Z — boolean互換性を即時削除せず期限付きで残す; 移行安全性を得る代わりに一時的な二重入力を許容し、矛盾指定はエラー、次のbreaking releaseで削除する。
- 2026-07-13T04:42:27Z — Claudeのnative方式を一律優先にしない; 相互調整が必要なUnitはAgent Teams、独立fan-outと反復収束はUltra Codeとし、topology判定の説明責任を負う。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-13T04:42:27Z — Codex UltraをAmadeusが選択・検証するprogrammatic surfaceと最低対応versionを後続の実現可能性調査で確定する。
- 2026-07-13T04:42:27Z — `AMADEUS_USE_SWARM`を削除する具体的なbreaking releaseをscope・delivery planningで確定する。
