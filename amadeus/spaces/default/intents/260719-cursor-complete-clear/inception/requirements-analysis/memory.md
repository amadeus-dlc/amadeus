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

- [2026-07-19T14:53Z] Interpretation: 修正方式(FR-1)は未決の設計判断として E-CCCRA 選挙へ(leader 指令(4))。裁定依存欄は【裁定待ち】プレースホルダのみ置き、裁定非依存部(FR-2〜4/NFR/制約)を先行起草(ruling-dependent-placeholder)。
- [2026-07-19T14:53Z] Interpretation: E-OC1 判定は Q2/Q3 とも選挙不要(Issue スコープ既決/append-only 既決ノルム)で leader 承認 14:50:57Z — 質問ファイル冒頭に判定要旨+承認 TS を記載してから [Answer] 記入(eoc1-evidence-in-questions-header)。
- [2026-07-19T14:53Z] Open question: lone-intent fallback(lib:1080)により方式 A 単独では単一 intent 空間で停止しない実測 — 選挙配信の実測コンテキストに含め、票の判断材料とした(推奨は伏せた)。

- [2026-07-19T15:07Z] Deviation: reviewer iteration 1 NOT-READY(Major 2件 = 機構引用の誤帰属)。lib:2147 は birth でなく migrateFlatLayout 内直接書込(書込経路は3経路: :1729 実体経由の birth :1921 / 切替 utility:3083、migrate :2147)。E-CCCRA 留保 e4 の runtime:1198 は handleFragmentFork 内で summary 経路でない — 注記で design への誤引継ぎを遮断(選挙 record 非改変)。是正前に指摘を独立再実測してから編集(fix-diff-independent-reverify)。iteration 2 で READY。
- [2026-07-19T15:07Z] Interpretation: 起草時の「書き手2箇所」は RE スキャンの grep(ACTIVE_INTENT_POINTER 直接参照)由来で、setActiveIntentCursor 経由の呼出(1921/3083)を落とした列挙不足 — enumeration-completeness-review の違反実例(既存 cid の適用で新規学習なし)。
