<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-08T03:30:37Z — PR レビュー(bot 2 系・7 スレッド)が指摘した欠陥のうち、設計契約を変える是正(除外バケットの追加)は「PR 上で直して終わり」にせず、上流 FD の不変条件を明示改訂 R-1 として改訂し code-summary へ申告付き逸脱として記録した; §12a reviewer は iteration 1 でこの未改訂を BLOCKER として捕捉した — PR レビュー由来の是正は record の設計契約と乖離しうる独立の入口であり、実装だけ直すと record 内自己矛盾が残る。
- 2026-08-08T03:30:37Z — conductor ツリーが実装 PR ブランチと別ブランチにある構成では、§12a reviewer の scope 内に古い実装が見えるため、ディスパッチ時に「実装は scope 外・作業ツリーの版は古い・実装の検証水準は code-summary の実測開示で代替」を明示した; 明示しない場合 reviewer は古い実装を読んで誤判定する。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-08T03:30:37Z — ハーネスの worktree 隔離ガード下で swarm referee(check/finalize)が使用不能のため、cid:code-generation:c1-pcp-isolated-session-swarm-incompat の isolation 経路(Agent worktree isolation + cherry-pick + fidelity diff 空の機械確認 + conductor ツリーでの検証再実行)で代替し、converged 表記を用いず検証水準をゲートで開示した。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
