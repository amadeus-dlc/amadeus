<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-05T03:18:00Z — 上流 requirements.md と stories.md が確定済みのため質問ファイルは作らず、設計判断はすべて decisions.md（D-AD1〜D-AD8）へ記録した
- 2026-07-05T03:18:00Z — カードは draft issue とし dirName で同定（D-AD1）; Intent と Issue の粒度差（issues は配列）を吸収するため

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-05T03:40:00Z — reviewer 2 巡（重大1/高1/中3/低2 → 再指摘 高1）で iterations 上限に達したため、最終指摘（*→--all 自動実行）は D-AD11（drop 化 + CLI 二重ガード）を反映のうえゲートへ進んだ; 全指摘の反映内容は decisions.md D-AD9〜D-AD11 と各成果物に記録

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-05T03:18:00Z — 削除なしの upsert 冪等（D-AD3）を採用; 完全ミラーの削除ロジックは軽量方針に反する
- 2026-07-05T03:18:00Z — スキャン対象は実行時 cwd の aidlc/ とした（D-AD7）; 複数 worktree の実況は「最後に書いた者」へ収束する

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
