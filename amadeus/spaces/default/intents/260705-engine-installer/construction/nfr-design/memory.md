<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T00:30:00Z — NFR design は既確定の REL/SEC 要求を実装手段（lstat 先行検査、join(target) 境界、rm+cp 冪等、エラー分類 2 種）へ落とすだけで、新規のアーキテクチャ判断はない。application-design の構成を変更する NFR 起因の理由がないことを logical-components で明示した。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-06T00:50:00Z — reviewer iteration 1 は NOT-READY（correctness 3 = スモーク fail の分類が O-2 確定と矛盾・工程中失敗の fix 案内から再実行併記が欠落・REL-2 の適用範囲過大、traceability 1）。全件修正: エラー分類を 3 分類の表（事前チェック / 工程中 / スモーク fail）に書き直して根拠 ID を明記、スモーク fail は独立ケース + doctor 固有の案内 + 表示区別、工程中は再実行併記を必須化、logical-components の配置層を全置換（REL-1 のみ）と衝突検査あり（REL-2）に分割。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
