<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-03T00:28:06Z — upstreamではUnit kindを省略可能だが、Issue #2019で承認されたローカル方針に従い、新規units-generation出力では必須、legacy runtimeでは省略可能なfull-matrix fallbackとして解釈した。
- 2026-08-03T00:28:06Z — legacy fallbackは、有効なmixed recordではkind省略Unitだけをfull matrixへ戻し、不正行で集合全体を安全に解釈できない場合は全Unitをfull matrixへ戻す現行runtime粒度として固定した。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-03T00:28:06Z — Issue本文の「engine無変更」から最小限逸脱し、producerのproduces_kindsをconsume側へ投影する要件を追加した。現行nfr-designのrequired consume非対称により、engine無変更ではlibrary経路が欠落入力を報告するため。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-03T00:28:06Z — NFR Designの3入力を全Unitでoptional化する案を退け、producer applicabilityの投影を選んだ。serviceの必須入力契約を弱めず、applicabilityの正本を増やさないため。
- 2026-08-03T00:28:06Z — wall-clock短縮は効果仮説として残す一方、モデル・review iteration・環境依存のため受入gateから外し、決定的な成果物集合と入力解決を合否指標にした。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-03T00:28:06Z — 未解決事項なし。実装中に既存produces_kinds map自体の不整合が見つかった場合のみ承認ゲートへ戻す。
