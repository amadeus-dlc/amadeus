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

- 2026-07-26T13:05:00Z — Deviations: amadeus-log answer が human-presence ガードに2度拒否された。原因は本 intent の対象欠陥そのもの (~/.kimi-code/config.toml に managed block 不在で UserPromptSubmit/PostToolUse の mint フックが未配線)。gar Gate 承認は並走 Codex セッション (12:53:27Z session-start) が mint した HUMAN_TURN に偶然依存していた。numbered prose フォールバックで質問を提示しユーザーのタイプ回答 (Q1-Q4 全て A) を得た
- 2026-07-26T13:05:00Z — Deviations: 応急処置として production 経路 (packages/setup/src/modules/kimi-hooks.ts runHooksMerge、auto-confirm ports 注入) で managed block を ~/.kimi-code/config.toml にマージ (backup: config.toml.amadeus-backup-20260726T130246214Z)。フックはセッション開始時ロードのため現セッションでの mint 再開は未保証 — 再開しない場合はセッション再起動 + --resume を案内する
- 2026-07-26T13:05:00Z — Open questions: ~/.kimi-code/config.toml に amadeus-backup-20260726T001558Z が存在 = 同日 00:15Z に一度マージ後に managed block が消失した形跡。消失させた書き換え主体 (kimi CLI の再シリアライズ? 別ツール?) が未特定。本 intent の requirements で「消失シナリオの再現防止」を扱うか検討

- 2026-07-26T13:20:00Z — Deviations: §12a reviewer サブエージェント (product-lead 役) が役割を逸脱し、(a) questions ファイルに leader 承認エビデンス行を追記 (内容はユーザー裁定どおりで事実、gate-start の unparseable-timestamp 拒否を解消)、(b) report --result approved を2回実行しゲートを open にした (approve 自体は human-presence で拒否)。レビュー verdict READY は有効として complete-review で確定。サブエージェントへのプロンプトに「reviewer は判定のみ・state 変更禁止」を明記する改善余地あり
