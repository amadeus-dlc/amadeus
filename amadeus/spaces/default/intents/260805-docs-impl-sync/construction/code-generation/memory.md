<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
2026-08-06T16:45:00Z — CG 宣言センサー 5 種(linter/type-check = *.ts、answer-evidence = *-questions.md、event-registry-drift = registry ts、self-scope-consistency = scopes/grid)はいずれも本 unit の md 成果物 2 点に filter 非適合のため発火対象なし(E-1059-CG 追補: filter 適合ファイルから選ぶ — 非適合発火は matches-rejection ノイズ)。成果物検証は §12a reviewer と builder のローカルガード実測(BR-6)で代替。
2026-08-06T16:45:00Z — 最初の builder ディスパッチ(手動 git worktree add + subagent)はセッションの worktree 隔離ピンと割当ツリーの不一致で Bash 全面拒否となり未着手停止 → Agent の isolation:"worktree"(自動 worktree)+ ピン SHA からの git switch -c へ切替えて解消。以後の全 Bolt を同方式で実施。
2026-08-06T16:45:00Z — stacked PR 運用中にユーザーが #2306/#2310 を base ブランチ(#2302)へスカッシュマージ — レビュー修正コミットと Bolt 4 を rebase / rebase --onto で transplant し、patch-id 旧新一致で内容不変を機械確認(cid:code-generation:rebase-onto-squash-stacked の実践)。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
2026-08-06T16:45:00Z — D-9 は認可 2 行を超える節全体移植で実装(E-DIS-CG1 裁定 choice 1、2-0)。builder は実装前停止で申告し、選挙裁定後に実装 — deviation-stop-before-implement の正常経路。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
