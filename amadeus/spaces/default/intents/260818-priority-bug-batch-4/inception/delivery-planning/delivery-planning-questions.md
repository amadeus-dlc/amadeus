# Delivery Planning — Questions

Intent: 260818-priority-bug-batch-4(depth Minimal、Intent Autonomy Mode = full — grant `intent-grant-6a7132513338ba97ba55f186a0881cc2`)

> material な質問は 0 件。sequencing の全次元が既決ノルム・上流成果物から機械的に導出される(執行であって判断ではない — team.md「一次証拠で事実が一意に確定し既決 contract へ機械的に適用するだけなら執行として自律実行してよい」)。導出根拠:
>
> - **Sequencing heuristic**: priority-queue(P2 → P3)。team.md § Issue 運用「着手順は優先度をキュー順」の機械適用 — #2837 = P2、#3106 = P3 で順序一意。WSJF 等の代替 heuristic を要する価値競合が存在しない(2 unit・優先度差あり)
> - **Bolt 粒度**: 1 Unit = 1 Bolt。project.md cid:units-generation:c1「PR 粒度は Bolt ごとを既定」+ 1 Issue = 1 Unit の帰結
> - **並行 vs 直列**: 直列。unit-of-work-dependency.md が確定した共有ファイル競合(amadeus-orchestrate.ts)+ requirements.md Constraints「delivery-planning で直列化を計画する」の適用。並行 worktree の rebase コストが 2 unit 規模で利得を持たない
> - **Walking skeleton**: 非適用。org.md § Walking Skeleton「スコープが既存コードベースへのインクリメンタルな作業(bugfix…)の場合はスケルトンのセレモニーをスキップ」の機械適用(scope = self-fix)
> - **外部依存**: なし(GitHub CI のみ。external-dependency-map.md 参照)
> - **Mob 割当**: team-formation SKIP につき全 Bolt = amadeus-developer-agent(stage 契約の既定)
