<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-31T10:12:26Z — 委譲4件+advisories 形状を ADR-1〜5 で確定(0問承認済み)。ADR-2 の同伴複製は Reliability の二重保持禁止と衝突しない(drift guard 付き=dist 同型)と明文整理

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-31T10:21:09Z — reviewer iteration 1 の Minor(coordinator :235→:243)をエビデンス付きで却下 — 両者の再実測で :235 が #1838 患部と確定し iteration 2 で reviewer が却下を追認。verbatim 併記で混同封じ

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-31T10:12:26Z — ADR-3 縮約で parked/manual 境界を初版スコープ外に — 検査対象2 invariant への寄与なしと判断、縮約で消える性質は成果物へ明記(finite-exploration 準拠)

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-31T10:12:26Z — model-map v2(複数モデル対応)の具体スキーマと一括 compose verb の命名は functional-design で確定
