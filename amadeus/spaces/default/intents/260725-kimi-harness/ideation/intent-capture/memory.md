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

- 2026-07-25T06:00:00Z — Interpretations: 質問は未決判断のみに絞る既定(intent-capture:c1)を適用し、承認済みプランの決定事項は「事前整理済みの裁定」として質問対象外にした。質問数は4問(Standard depth の 5-8 下限を下回るが、c1 規則が優先)
- 2026-07-25T06:00:00Z — Interpretations: Q3(ゲート・質問のレンダリング形式)はユーザー指摘により「設計導出可能な事項はユーザー質問にしない」と判断し撤回。harness annex(question-rendering.md)の設計事項であり、Kimi の AskUserQuestion + PostToolUse 観測成立から claude 型 annex 採用を事前裁定へ移動
- 2026-07-25T06:00:00Z — Deviations: hook 未配線(Kimi に kimi harness 未インストール)のため、human-presence の HUMAN_TURN を「ユーザーの回答プロンプトを mint-presence hook に手動パイプする」replay で補償した。脅威モデル(モデルの presence 偽装)に反しない — 実際に人間が応答したターンのみ replay。これは kimi adapter の mint target が自動化する挙動そのものであり、dogfood 証拠として記録
- 2026-07-25T06:00:00Z — Deviations: PostToolUse フック非稼働のため TaskUpdate 由来の state sync が動かず、todo は手動管理。センサーは学習規則(sensor-before-reviewer / manual-sensor-fire-before-gate-report)どおり手動発火で実施(全5発火 PASSED)
- 2026-07-25T06:00:00Z — Tradeoffs: 質問ファイルの「事実」欄は当初サブエージェント報告の転記だったが、ユーザーの不安表明を受け file:line 実測に更新した。以降のステージでも「事実」は直接実測か出典明記を徹底する(P2)
- 2026-07-25T06:00:00Z — Open questions: プランの列挙更新ポイント行番号(packages/setup 等)は未実測。feasibility / reverse-engineering でスキャンして確定させる
