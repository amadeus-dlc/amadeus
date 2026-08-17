# Team Allocation — intent 260816-priority-bug-batch-3

team-formation(1.5)は本スコープで SKIP。ソロモード(team.md Operating Modes)につき、全 Bolt を AI が実行する。

## 割当

| Bolt | Unit | 実行主体 | 備考 |
|---|---|---|---|
| Bolt 1 | autonomy-refusal-idem | amadeus-developer-agent(swarm 配下では amadeus-builder-agent) | conductor が §12a レビューと状態遷移を所有 |
| Bolt 2 | milestone-presence | 同上 | Bolt 1 の着地後に着手(依存) |
| Bolt 3 | prc-finalization | 同上 | 並行レーン可 |
| Bolt 4 | source-work-probe | 同上 | amadeus-state.ts 群の直列着地 |
| Bolt 5 | election-append | 同上 | 並行レーン可 |

## 役割規律

- 状態遷移・ゲート提示・レビュー・学習リチュアルは conductor のみ(cid:practices-discovery:c2-engine-mutation-ban — サブエージェントに engine/state ツールを触らせない)
- 各 Bolt は git worktree 分離で実装(cid:code-generation:solo-bolt-worktree-required)。新規 worktree は依存インストール + `bun run build` を定型手順に含む
- §12a レビュアーは各 unit につき read-only 種別で独立起動。マージは人間承認(常任承認は必須 CI green ∧ converged: true の実測時のみ — team.md Learnings Inbox の常任マージ承認)
