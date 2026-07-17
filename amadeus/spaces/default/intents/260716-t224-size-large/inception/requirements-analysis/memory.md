<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-07-16T08:34:12Z — reviewer iteration 1 = REVISE(M-1: センサー FAILED のまま報告 — **conductor の検証誤り: fire の exit 0 を PASS と誤読**。実仕様は「FAILED 時のみ finding 詳細を生成・exit は常に0」(amadeus-sensor.ts :15/:23)で、verdict は finding 有無/audit 行で読む。questions の H2 0個+upstream 3面未参照が実 FAILED だった / Mi-1: 実測レンジ表記→閾値相対へ / Mi-2: drift 表示の非ブロッキング性明記)→ 3件是正(H2 節化・上流参照+非該当根拠・閾値相対表記・:915 注記)→ 再発火4回で finding 増加ゼロ = 全 PASS を正しい方法で確認
- 2026-07-16T08:34:12Z — 自省(manual-sensor-fire-before-gate-report 違反): 「センサー 4/4 PASS」の初回報告は exit code のみの偽検証 — 過去 intent の同報告は偶然正(実 PASS で finding 無音)だったが、本 intent で初めて FAILED を見逃した。検証は exit code でなく成果(finding 有無・audit の PASSED/FAILED)で読む — L-CG1 のセンサー面。§13 候補として提出予定

- 2026-07-16T08:38:30Z — reviewer iteration 2 = READY(GoA 1、閉包検証限定): M-1 センサー再発火4回 finding 増加ゼロ+audit SENSOR_PASSED 4対 / Mi-1 閾値相対表記 / Mi-2 run-tests.ts:915-916 実文一致 — すべて独立実測で確認。gate-start へ進行

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
