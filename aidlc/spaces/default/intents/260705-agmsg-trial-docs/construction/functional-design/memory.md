<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-05T15:20:00Z — units-generation は refactor scope で SKIP のため、前例（260705-ledger-pr-docs ほか同日 3 record）に合わせて unit 名を Intent label（agmsg-trial-docs）とし、成果物を construction/agmsg-trial-docs/functional-design/ に置く。aidlc-state.md の Per unit: [TBD] は実 unit 名へ手動更新する（project.md Corrections の前例 e10f8294）。
- 2026-07-05T15:20:00Z — requirements.md O-1（成果物文書の分割単位）は本ステージで確定する: 1 文書 3 節構成とする。根拠は FR-3.1 が「成果物文書の冒頭に適用条件節」と単一文書を前提に書かれていること、3 成果物が同じ適用条件を共有し分冊にすると適用条件の重複か参照分散が生じること。ピア協議にはかけない（#497 確定判断 6 はピア協議を「回答してよい」と許可する規定であり、小さな構造判断は担当 engineer の自己判断で進め、gate の人間承認で確定する）。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-05T15:20:00Z — Step 3〜4 の functional-design-questions.md は作成しない。要求（FR-1〜FR-4、C-1〜C-6）とピア協議 4 問の確定回答で設計判断は尽きており、残る O-1 も上記のとおり本ステージで確定したため。前例（260705-ledger-pr-docs の functional-design）も questions ファイルなしで成立している。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-05T15:35:00Z — 本 memory.md の置き場はエンジン directive の memory_path（construction/functional-design/memory.md = ステージ階層）であり、成果物の per-unit 階層（construction/agmsg-trial-docs/functional-design/）と 1 階層ずれる。learnings surface が runtime graph の memory_path を読むため移動せず、エンジン解決のままを受け入れる（reviewer 指摘 2 への回答。単一 unit の refactor Intent では実害なし）。
- 2026-07-05T15:35:00Z — ステージ frontmatter の required 入力 4 件（unit-of-work、components、component-methods、services）は refactor scope の SKIP により不在（consumes_absent expected: true）。ステージ本文 Step 2 が不在時の進行を明示的に許可しており、同日前例 260705-ledger-pr-docs も同条件で通過済み。upstream-coverage sensor がこれらで SENSOR_FAILED を出しても想定内として扱う（reviewer 指摘 4 の申し送り）。
