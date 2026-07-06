<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T09:40:00Z — 手順書とチェックリストを journal/ 配下（logger-*.md）に同居させ、FR-2.1 の命名規約を 3 種に確定した（→ 09:50 の Deviations で撤回・訂正済み: knowledge/ 配置 + FR-2.1 の 2 種列挙維持が確定値）。per-unit gate: false → body 実行 → 再 next の契約に従い進行。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-06T09:40:00Z — 実装細部の問いは 3 モード質問フローを経由せず自己判断（理由付き）で確定（多体連携の小さな構造判断。gate 人間承認で確定）。
- 2026-07-06T09:50:00Z — reviewer iteration 1 の blocking 2 件を反映: ①checkJournal の実装位置を lifecycle-v2.ts（record スコープ = 誤り）から AmadeusValidator.ts::checkSpaceLayers()（space スコープ、無条件実行）へ是正し、optional 扱い（配布互換）を追加確定 ②手順書類の journal/ 配置が gate 承認済み FR-2.1 の閉列挙を無断拡張していたため、knowledge/ 配置へ変更し FR-2.1 を維持（Q3 として明示化）。非ブロッキング 1 件も採用: 新規 eval dir をやめ既存 amadeus-validator eval へ journal ケースを追加（チェーン編入済み・重複ハーネス回避）。承認済み契約の無断変更は #524 functional-design の指摘と同型であり、同じ「要求を変えず設計を要求へ合わせる」で解消。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
