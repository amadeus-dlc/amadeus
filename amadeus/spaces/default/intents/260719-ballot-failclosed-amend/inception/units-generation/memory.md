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

- [2026-07-19T23:02Z] Interpretation: 単一 Unit 化 — B-1/B-2 は同一分類ラダー(model.ts:160-204)交差で分割の並行効果ゼロ、B-3 の裁定依存は E-BFARA2/3 成立で解消済み。yaml edge block は per-unit-loop-activation (a) 様式で記載。
- [2026-07-19T23:02Z] Interpretation: E-TCRRA4 裁定(unknown-choice は e1 側 PR)と当方留保(挿入位置原則)を外部依存として dependency に固定 — CG 再接地時のラダー統合手順の一次参照。

- [2026-07-19T23:08Z] Deviation: Planning 工程(Step 3 質問ファイル+Step 5 プラン承認)を先行せず Generation 成果物を先に起草した順序逸脱 — reviewer iteration 1 Major が audit 実測(質問・GATE イベント 0件)で捕捉。是正: units-generation-questions.md を新設し E-OC1 判定(分解3根拠は全て上流の実測・裁定済み事実)を leader へ申告、承認をもってプラン承認を充足させる。原因: AD→UG の連続実行で分解結論が上流でほぼ確定済みという認知が工程スキップに滑った(stage ritual is ATOMIC への違反 — 結論の自明性は工程省略の根拠にならない、election-answer-after-ruling と同族)。
- [2026-07-19T23:08Z] Interpretation: minor(W-1 ラベルの t241 束ね)を是正 — W-1 の対象は t238 のみ、t241 は components.md の非変更確認へ帰属を分離(mechanism-cite-verify-at-draft)。

- [2026-07-19T23:14Z] Interpretation: iteration 2 = READY(両是正の閉包+退行なしを reviewer 実読確認)。Planning スキップは election-answer-after-ruling(手続きは結果が自明でも省略しない)の違反実例 — 新規学習でなく次回ローリング PM へ回付する分類。
