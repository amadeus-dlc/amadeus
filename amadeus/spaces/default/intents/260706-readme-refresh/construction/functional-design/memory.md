<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T01:50:00Z — 上流入力は inception/requirements-analysis/requirements.md（FR-1〜FR-8）である。units-generation SKIP のため unit 名は readme-refresh とし、aidlc-state.md の Per unit: [TBD] を record 整合として手動更新した（前例: e10f8294、project.md Corrections の cid:build-and-test:c2）。
- 2026-07-06T01:50:00Z — 設計は節ごとの編集計画（business-logic-model）+ 照合台帳（domain-entities）で構成した。README の記載対象と実体の正の対応を台帳化することで、code-generation が機械的に照合しながら書けるようにした。
- 2026-07-06T01:50:00Z — Quickstart の「mock-based」も実体不一致（test:all は決定論的 e2e・eval 群）として編集対象に含めた。乖離 6 系統の「上記以外」の範囲内と解釈する。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-06T02:05:00Z — functional-design-questions.md は作成しない（自己判断）。本ステージの設計判断はすべて requirements.md（gate 承認済み）と requirements-analysis-questions.md の Q1〜Q3 で確定済みで、新規の質問が生じなかった。business-rules.md の BR-3 / BR-4 の引用は requirements-analysis-questions.md への解決可能な相対リンクへ修正した（reviewer iteration 1 指摘 4 への対応。questions ファイルの省略可否は team.md の質問プロトコルにより自己判断の対象）。
- 2026-07-06T02:05:00Z — memory.md の配置は engine directive の memory_path（construction/functional-design/memory.md、unit dir なし）を正とし、reviewer iteration 1 指摘 3（unit dir 配下へ移動）は false positive として不採用。前例 260706-docs-lang-guide も同じ配置で、unit dir 側には memory.md が存在しないことを実測確認した。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
