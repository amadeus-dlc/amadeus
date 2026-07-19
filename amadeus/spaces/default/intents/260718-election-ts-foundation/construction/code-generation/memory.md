<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-19T10:2xZ — U4 builder 最終報告の遅延配送を照合: 回収済み内容と一致・新規指摘なし(late-verdict-diff-absorption)。worktree 側の未コミット state 差分は finalize の state 簿記で処理済み
- 2026-07-19T09:55:00Z — swarm finalize は単一 --check-cmd を全 claimed ユニットの worktree で再検証する — ユニット固有テストを指定すると他 worktree に該当ファイルがなく偽赤(2/3 failed を実測)。ユニット別の finalize 呼出(--units/--claimed を単数)で解消。swarm-finalize-claimed-required の check-cmd 面の運用知識
- 2026-07-19T09:55:30Z — squash マージ跨ぎの stacked ブランチは `git rebase --onto origin/main <旧base> <branch>` で衝突ゼロ transplant を実測(Bolt 4 を Bolt 3 PR 上に先行実装→#1233 着地後に載せ替え)。autonomous モードで PR 待ちを塞がない実務手順
- 2026-07-19T09:56:00Z — GoaLineCode 域制約(Q3=A)は election ID 自体の入口検査に及ぶ — 複節形 fixture ID(E-LOOP-1 等)が設計どおり即拒否され、fixture を適合形へ更新(fail-closed が正しく機能した実測)
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-19T09:57:00Z — Bolt 5 を Bolt 4 レビュー待ち中に先行着手(bolt-plan の並び依存に対し、変更ファイル実 diff 非交差 = c6 を根拠とする申告付き前倒し。PR #1236 本文・U6 code-generation-plan に記録)
- 2026-07-19T09:57:30Z — #1227 レビューの状態シフト Major-2 は処置 (b)(申告付き FD 追補)で解消 — open verb が作成+公開の単一操作のため draft は内部中間状態、未公開定義への配布指令を出さない fail-closed 強化(U5 FD 指令表を改訂)
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
