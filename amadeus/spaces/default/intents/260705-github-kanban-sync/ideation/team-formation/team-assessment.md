# Team Assessment（260705-github-kanban-sync）

上流入力: [scope-document.md](../scope-definition/scope-document.md)、[intent-backlog.md](../scope-definition/intent-backlog.md)、[feasibility-assessment.md](../feasibility/feasibility-assessment.md)

## 体制

1 人の Maintainer と複数エージェントの自己開発体制である（team.md の並行運用ポリシー準拠）。
本 Intent は team-formation-questions.md Q1 = A により、Claude セッションが proto-Unit P1〜P3 を直列に担当する。
P1 → P2 → P3 は直線依存（intent-backlog.md）のため、worktree を分けた並行の利得はない。

## 役割

| 役割 | 担当 | 責務 |
|---|---|---|
| ゲート審査官 / merge | Maintainer（j5ik2o） | 各ゲート承認、`gh auth refresh -s project`、org project 作成権限の確認、PR merge |
| 実装 | Claude セッション | P1（台帳整備）、P2（手動 sync）、P3（hook 結線）を直列に実装。各段階を別 PR にする |
| PR レビュー | レビューボット + Maintainer | 従来どおり（Q2 = A）。ボットコメント対応と CI green は実装側、merge 判断は人間 |

## キャパシティ所見

暫定機構（C07）であり、追加の人員・スキル獲得は不要である。
必要スキル（Bun + TypeScript、gh CLI、GraphQL、hooks 基盤の理解）は既存の開発実績（dev-scripts、hooks 群）で充足している。
