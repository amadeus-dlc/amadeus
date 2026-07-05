# Initiative Brief（260705-github-kanban-sync）

対象 Issue: [#470](https://github.com/amadeus-dlc/amadeus/issues/470)

## 概要

複数エージェント並行自己開発の「どの Intent / Issue をどのエージェントが、どのホストで作業中か」を、GitHub Projects v2 の board（Maintainer 専用の一方向鏡）で一覧できるようにする。
暫定機構として軽量に実装し、後日本格的な仕組みへ置き換える前提である。

各成果物の要点は次のとおり（詳細は各リンク先）。

| 領域 | 要点 | 出所 |
|---|---|---|
| 問題と成功指標 | 担当状況の不明（主）+ 承認待ち滞留の検知（従）。一覧性 / 確認時間短縮 / 放置ゲート発見 / 自動追従 + ホスト識別 | [intent-statement.md](../intent-capture/intent-statement.md) |
| 既存代替 | ローカル成果物スキャンを担う既存ツールは無い。Build（sync だけ自作）採用 | [competitive-analysis.md](../market-research/competitive-analysis.md) |
| 実現性と制約 | 全構成要素が実現可能。制約 C01〜C11（一方向鏡、repo 内限定、gh CLI のみ、graphql batch、非同期 hook、軽量実装 ほか） | [feasibility-assessment.md](../feasibility/feasibility-assessment.md)、[constraint-register.md](../feasibility/constraint-register.md) |
| 範囲 | In: ①台帳整備 → ②手動 sync → ③hook 結線（別 PR）。Out: Actions 補完、statusline、双方向 sync、他 workspace | [scope-document.md](../scope-definition/scope-document.md) |
| Backlog | P1 registry-issues-field → P2 kanban-sync-manual → P3 kanban-hook-flush（+P4 auto-archive = Should） | [intent-backlog.md](../scope-definition/intent-backlog.md) |
| 体制 | Claude セッションが直列担当、mob なし、レビューは PR で人間 | [team-assessment.md](../team-formation/team-assessment.md) |
| UI 骨子 | 6 列（Awaiting Approval 優先）+ 8 カスタムフィールド + Table view 併用 | [wireframes.md](../rough-mockups/wireframes.md) |

## Inception への引き渡し

- ブロッカーなし（approval-handoff-questions.md Q1 = A）。未解消 2 件（project scope 付与、org project 作成権限）は P2 着手前の人間操作。
- Ideation 完了時点で phase PR を作成する（Q2 = A）。
- Inception では requirements-analysis 以降で、sync の入出力契約（スキャン対象フィールド、GraphQL 反映単位、キュー形式）を確定する。
