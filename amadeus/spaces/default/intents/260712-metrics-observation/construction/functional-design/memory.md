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

- 2026-07-12T06:26:00Z — Interpretation: unit リスト未コンパイル(directive unit=None)のため SKILL fallback に従い単一ステージとして3ユニット分を作成(per-unit ディレクトリ様式は batch6 前例踏襲)。U2 の domain-entities は functional-domain-modeling-ts 様式(判別ユニオン・スマートコンストラクタ・依存注入 seam)。U3 のループ防止は「GITHub_TOKEN 非トリガー一次+paths-ignore 不採の理由明記」で設計。
- 2026-07-12T06:26:00Z — Tradeoff: U1 の書き出し失敗は runner exit に影響させない(coverage-totals 同型の best-effort)— loud fail の責務は消費側(U2 の fault)に置く分界を business-logic-model に明記。
- 2026-07-12T06:32:00Z — Deviation: architecture-reviewer iteration 1 = NOT-READY 5件(F1 artifact 契約未成立/F2 ci-success 集約の虚偽主張/F3 書き出し位置矛盾/F4 best-effort 前例の事実誤り/F5 test_pyramid ソース未確定)。F4 は「前例引用の実挙動未検証」で E-L38 系の実例。全5件を是正(F2 は「ci-success に含めない」設計判断へ、F5 は静的走査へ確定)し iteration 2 へ。
