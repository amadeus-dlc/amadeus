# Mob Composition（260705-github-kanban-sync）

上流入力: [team-assessment.md](team-assessment.md)、[intent-backlog.md](../scope-definition/intent-backlog.md)

## 編成

mob（複数エージェントの同時協働）は編成しない。

P1 → P2 → P3 が直線依存であり、同一 worktree での直列実行が検証の信頼性を保つ（team.md の直列化ポリシー）。
Claude セッション単独の直列実行とし、各段階の完了ごとに PR とゲートで Maintainer が確認する。

## 協働が発生する場面

| 場面 | 形 |
|---|---|
| ゲート承認と board 確認（P2 完了時） | Maintainer が board の実表示を確認してから P3 に進む |
| PR レビュー | レビューボットのコメントに実装側が対応し、Maintainer が merge する |
