# Team Allocation — installer-new-harnesses(Issue #1048)

上流入力(consumes 全数): `../requirements-analysis/requirements.md`、`../user-stories/stories.md`、`../refined-mockups/mockups.md`、`../application-design/components.md`、`../units-generation/unit-of-work.md`、`../units-generation/unit-of-work-dependency.md`、`../units-generation/unit-of-work-story-map.md`、`../practices-discovery/team-practices.md`。

## Bolt → mob 割当

| Bolt | mob | 役割 |
|---|---|---|
| Bolt 1(U1) | conductor = e3、builder = worktree 隔離 subagent(amadeus-developer-agent)、reviewer = 実装者以外(独立レビュー) | code-generation は subagent ディスパッチ(c2 隔離規律+builder-prompt-sync-completion+deviation-stop-before-implement を毎回明示)。conductor は検証裏取り(evidence-discipline) |

## 制約(team.md 既決の適用)

- 同時アクティブ builder は 1 intent あたり最大4 — 本 intent は Bolt 1本・builder 1名で枠内
- 自己実装の自己レビュー禁止 — PR レビューは e3 以外のメンバーへ依頼し、leader 報告にレビュアー名を含める
- PR マージは leader 執行(ユーザー承認後)— no-AI-merge 維持
