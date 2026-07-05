<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-05T16:10:00Z — units-generation は refactor scope で SKIP のため、前例（260705-agmsg-trial-docs ほか）に合わせて unit 名を Intent label（steering-learnings）とし、成果物を construction/steering-learnings/functional-design/ に置く。aidlc-state.md の Per unit: [TBD] は実 unit 名へ手動更新する（project.md Corrections の前例）。
- 2026-07-05T16:10:00Z — requirements.md O-1（新節の配置と小見出し構成）は本ステージで確定した: 配置は並行運用ポリシーの「ゲート承認の運用」の直後、小見出しは適用条件 / エージェント固定 worktree / 質問プロトコル / 承認中継の 4 つ。委任構造の記述に隣接させると判断の流れが自然につながるため。小さな構造判断につきピア協議にはかけず、gate の人間承認で確定する（試行前例の運用細目に従う）。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-05T16:10:00Z — functional-design-questions.md は作成しない。要求（FR-1〜FR-4、C-1〜C-6）とピア協議 4 問の確定回答で設計判断は尽きており、残る O-1 も本ステージで確定したため。前例（260705-agmsg-trial-docs、260705-ledger-pr-docs の functional-design）も questions ファイルなしで成立している。
- 2026-07-05T16:10:00Z — ステージ frontmatter の required 入力 4 件（unit-of-work、components、component-methods、services）は refactor scope の SKIP により不在（consumes_absent expected: true）。ステージ本文が不在時の進行を許可しており、試行前例も同条件で通過済み。upstream-coverage sensor がこれらで SENSOR_FAILED を出しても想定内として扱う。
- 2026-07-05T16:10:00Z — 本 memory.md の置き場はエンジン directive の memory_path（construction/functional-design/memory.md = ステージ階層）であり、成果物の per-unit 階層と 1 階層ずれる。learnings surface が runtime graph の memory_path を読むため移動せず、エンジン解決のままを受け入れる（試行前例と同じ）。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-05T16:25:00Z — reviewer iteration 1 は NOT-READY（重大 1 = 既存原則「worktree を Intent ごとに分ける」との矛盾未解消、中 1 = FR-2 の具体化不足、軽微 2 = 見出しレベル未確定、Per unit [TBD] 未更新）。全件を修正した: (1) 新節に「既存原則との整合」方針を追加（変更作業は 1 Intent = 1 worktree に閉じる点は維持、ロール固定は割り当て方の運用、他ロールは対象 Intent のファイルを変更しない）、(2) FR-2 の追記位置・文言方針・実例（eng1/issue-497-trial、eng2/issue-502-steering）を具体化し BR-13 / BR-14 を追加、(3) 見出しレベルを H2 + H3 ネストと確定、(4) aidlc-state.md の Per unit を steering-learnings へ手動更新。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
