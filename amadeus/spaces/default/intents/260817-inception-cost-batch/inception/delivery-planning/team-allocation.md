# Team Allocation — インセプション固定費バッチ(#3181 + #2415)

team-formation ステージは本スコープで SKIP。team.md § Operating Modes のとおりソロモードが現行唯一の運用形態であり、Bolt-to-mob 割当は次の固定形とする(`bolt-plan.md` の2 Bolt に対応)。

## 割当表

| Bolt | Units | 実装 | レビュー | 統合・ゲート |
|---|---|---|---|---|
| Bolt 1 | `issue-evidence-upstream` | amadeus-developer-agent(builder subagent、bolt worktree 内)| §12a reviewer(read-only subagent)| conductor(worktree 分離・取込・ゲート提示・walking-skeleton 承認の取得)|
| Bolt 2 | `re-input-exclusion` | 同上 | 同上 | 同上 |

## 運用規律(unit-of-work.md の制約の転記)

- Bolt 実装は git worktree 分離(`cid:code-generation:solo-bolt-worktree-required`)— 本線ツリーのブランチ切替で実装しない。新規 worktree は依存インストール+`bun run build` を定型に含む
- builder は engine/state 変更操作を行わない(`cid:practices-discovery:c2-engine-mutation-ban`)— 状態遷移・ゲート・§13 は conductor 専任
- builder 作業中の worktree で conductor が record sync する場合はパス限定 commit(`cid:code-generation:c2-record-sync-pathspec`)
