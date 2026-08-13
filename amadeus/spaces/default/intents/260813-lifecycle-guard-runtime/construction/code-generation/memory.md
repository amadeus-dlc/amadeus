<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-13T17:50:00Z — PR は先例(PR #2920 が record 18 ファイルを同梱)に合わせ conductor ブランチ(record + bolt merge)を head に作成(#2986)。pr-convergence CLI の create 前提(checked-out branch == head、record が head checkout 内に実在)も bolt 単独ブランチでは満たせないため
- 2026-08-13T17:50:00Z — conductor ツリーのフルスイートは 1 ファイル赤(t528)。純正 main のクリーン checkout で「素は green / CLAUDE_PROJECT_DIR を active full-autonomy workspace へ向けると赤」を実測し、既存の隔離バグ(#2981)由来と確定。根本原因(orchestrate.ts:6021-6024 の ambient フォールバック + runsQualityRepair)を #2981 へ実測付きコメントで追記。bolt worktree のフルスイートは green(990 files / 0 fail)

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-13T17:50:00Z — model-map impl-only 更新と trust フィールド不採用の実装判断 2 件は decide-question 梯子で裁定(AUTO_DECIDED 3fe86a60 / cbd40080)し追認した

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-13T18:00:00Z — ノルム矛盾候補(ユーザーエスカレーション): team.md「Bolt ごとに PR を出し…工程記録を束ねない」に対し、pr-convergence CLI の create 前提(record が head checkout 内に実在)と先例 PR #2920(record 18 ファイル同梱)は record 同梱を要求/実践している。§13 候補 c1(AUTO_DECIDED keep-c1-only c0531693)は admission conflict-check でこの矛盾に当たり persist を保留した。文言の是正(例:「複数ユニット・無関係リファクタを束ねない。自 intent の record checkpoint は同梱可」)か CLI 側の是正かはユーザー裁定待ち
