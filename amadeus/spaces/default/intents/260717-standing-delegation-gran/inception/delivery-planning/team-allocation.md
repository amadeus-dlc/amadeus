# Team Allocation — standing-delegation-grant

上流入力(consumes 全数): `../units-generation/unit-of-work.md`(単一 Unit standing-grant)、`../units-generation/unit-of-work-dependency.md`(edge block・bolt_dag 非 null 実測済み)、`../units-generation/unit-of-work-story-map.md`(FR トレース)、`../application-design/components.md`(C-1〜C-6)、`../requirements-analysis/requirements.md`(FR-1〜8)、`../practices-discovery/team-practices.md`(変更 0 件 — practices 制約なしの確認)

## 体制

| 役割 | 担当 |
|------|------|
| conductor | e4(本 intent の指揮・検収・ゲート執行) |
| builder | worktree 隔離の developer subagent(Bolt 1 実装) |
| reviewer(stage) | architecture-reviewer subagent(委任分析・verdict 所有 e4) |
| reviewer(PR) | 実装者以外のメンバー(creator-first 指名 — PR 発行時に確定) |
| 承認 | ステージゲート = delegate(leader)/ PR マージ = ユーザー(no-AI-merge) |

## 割当原則

役割は領域アフィニティと帽子(conduct/review)で割り当て(role-model)。自己実装の自己レビュー禁止 — PR レビュアーは builder(subagent)とも conductor(e4)とも独立のメンバーから指名する。
