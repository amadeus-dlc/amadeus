<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-07-17T03:33:00Z — E-SDG-RA(全問 A)+E-SDG-RA2(C=既定除外+opt-in、留保3件を AC-4f へ転記)を焼き込み。ユーザー standing authorization(#1125 comment 4998659131)を FR-1/2 由来へ追加。レビュー iteration 1 条件付き READY(Major 3: 引用2件+表2行)→ 全件是正(:568 は是正時独立再実測で :572 へ精密化 = fix-diff-independent-reverify)→ iteration 2 READY(留保転記 3/3 分母照合込み)
- 2026-07-17T03:33:00Z — design への申し送り(reviewer 留意事項の保存): phase-boundary の「ゲート」は phase-check ガード(artifact 存在検査)と human-presence 判定の別系統 — AC-4e の opt-in フラグがどの呼び出し箇所を切り替えるかを design で機構レベルまで一意に確定し、AD レビューで mechanism-cite-verify / citation-semantics-check 観点として必ず検証すること

- 2026-07-17T03:14:00Z — FR-1〜8 を成功基準1〜7+C-1〜C-10 から起草。設計4論点(保存配送/撤回伝播/session失効/TTL値)は E-SDG-RA 選挙へ(全問前提実測付き — TTL は意味論対照定数不在のため値の新規決定を選挙で)。RE 発見の fail-open 非相乗りを AC-3b として要件化
- 2026-07-17T03:14:00Z — GRANT_ISSUED/REVOKED の PRESENCE_PROTECTED_EVENTS 追加(AC-7a)を偽造耐性要件として明記 — HUMAN_TURN mint 拒否と同族の in-process 専書き込み

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
