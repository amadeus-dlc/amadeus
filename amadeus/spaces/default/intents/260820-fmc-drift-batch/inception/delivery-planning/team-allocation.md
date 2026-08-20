# Team Allocation — 260820-fmc-drift-batch

上流入力: `bolt-plan.md`、`unit-of-work.md`(write scope)、`unit-of-work-dependency.md`(並列集合)、`unit-of-work-story-map.md`(Issue 対応)、`requirements.md`(FR-REG-6/FR-X-4 の conductor 帰属)、`components.md`(所有 unit)。ソロ運用(team.md Operating Modes)のため「チーム」は conductor + builder subagent 群。

## 割当

| 役割 | 担当 | 対象 |
|---|---|---|
| conductor(本セッション、Fable) | ステージ運転・worktree 準備・§12a 統括・swarm referee 駆動・PR 収束・マージ(常任承認条件)・record 書込・FR-REG-6 / FR-X-4 | 全 Bolt |
| builder subagent(amadeus-builder-agent)× 1 | Bolt 1: `advisory-retirement` の実装(自 worktree 内、write scope 厳守) | Bolt 1 |
| builder subagent × 2(並列) | Bolt 2: `revise-model-commit` / `boundary-three-face`(worktree 分離、非交差 write scope) | Bolt 2 |
| builder subagent × 1 | Bolt 3: `applicability-arms` | Bolt 3 |
| reviewer subagent(§12a、read-only 規律 + SendMessage 返送) | 各 unit の code-generation レビュー(unit ごと、swarm 配送では配送時に verdict 確立 — cid:code-generation:c3-swarm-verdict-at-delivery) | 全 unit |

## 制約

- builder は engine/state ツール(amadeus-orchestrate / state / log / bolt / election)を実行しない(cid:practices-discovery:c2-engine-mutation-ban)— 状態遷移・ゲート・§13 は conductor のみ
- builder の作業中 worktree で conductor が record sync する場合は `git add -- amadeus/` のパス限定 + builder 静止時のみ(cid:code-generation:c2-record-sync-pathspec)
- 並列 Bolt の coverage 計測は branch ごとに単独所有者(cid:code-generation:c1-coverage-single-owner)
