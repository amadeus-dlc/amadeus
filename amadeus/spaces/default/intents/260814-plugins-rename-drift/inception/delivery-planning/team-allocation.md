# Team Allocation — 260814-plugins-rename-drift

上流入力: `bolt-plan.md`(B1〜B3)、`units-generation/unit-of-work.md`。team-formation(1.5)は self-feature グリッドで SKIP のため mob 編成は存在しない。

## 割当

ソロモード(team.md Operating Modes — 現行の唯一の運用形態)。全 Bolt を conductor 管理下の AI が実行する:

| Bolt | 実装主体 | レビュー |
|---|---|---|
| B1 rename | amadeus-developer-agent(code-generation 段の subagent)/ 委譲実装は amadeus-builder-agent | ステージ宣言のレビュアー(§12a)+ PR の独立レビュー |
| B2 settings-core | 同上 | 同上 |
| B3 git-drift | 同上 | 同上 |

## 人間の関与点

- B1 の walking-skeleton ゲート(残り Bolt 実行前の明示承認 — semi でも milestone)
- 各 PR のマージ承認(AI 自発マージ禁止 — FR-X-4)
- phase 境界・intent 完了(semi の milestone)
- fail-closed で人間へ回った裁定
