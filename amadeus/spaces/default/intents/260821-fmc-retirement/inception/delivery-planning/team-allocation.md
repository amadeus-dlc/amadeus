# Team Allocation — 260821-fmc-retirement

## 割り当て

| 役割 | 担当 | 責務 |
|---|---|---|
| conductor | 本セッション(Fable 5) | ステージ進行・ゲート・レビュー起動・record 管理・着地後アクション |
| builder | amadeus-builder-agent(サブエージェント、bolt worktree 隔離) | Bolt 1 の実装(削除・fixture 新設・テスト差し替え・台帳 regen) |
| reviewer | amadeus-architecture-reviewer-agent(§12a、read-only) | code-generation 成果物のレビュー |

## 運用制約

- builder は engine/state ツールを実行しない(cid:practices-discovery:c2-engine-mutation-ban)
- Bolt 実装は git worktree 分離(cid:code-generation:solo-bolt-worktree-required)— 新規 worktree では `bun install` + `bun run build` を移設定型に含める
- `plugins/github-pr-convergence/` への書込禁止(#3382 並行作業)
