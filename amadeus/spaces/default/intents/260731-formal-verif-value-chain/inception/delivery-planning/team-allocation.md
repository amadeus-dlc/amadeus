# Team Allocation — formal-verif-value-chain

上流入力(consumes 全数): requirements, components, unit-of-work, unit-of-work-dependency, unit-of-work-story-map

## 実行形態

ソロモード(`AMADEUS_OPERATING_MODE=team` 未設定)。1 エージェントが工程ごとに leader / conductor / builder / reviewer の責務を順次担う。leader/member 配送・agmsg ack・複数メンバー定足数は適用しない(team.md § Operating Modes)。

## 工程担当

| 工程 | 担当 | 備考 |
|---|---|---|
| Bolt 実装(B1-B8) | conductor が builder サブエージェントへ worktree 隔離で委譲 | solo-bolt-worktree-required — 本線ツリーで実装しない |
| §12a レビュー | 各ステージ宣言の reviewer サブエージェント(architecture-reviewer / quality 系) | 自己実装の自己レビュー禁止 |
| PR レビュー | conductor が独立コンテキストで実施(unit-of-work の AC 実測) | ソロのため人的2名レビューは不成立 — 実測検証で代替 |
| ゲート承認 | ユーザー(AskUserQuestion) | walking-skeleton ゲートは必ず人間 |
| PR マージ | ユーザー承認後に conductor が実行 | no-AI-merge |

## 判断のエスカレーション

未決の設計判断・仕様変更・不可逆操作はユーザーへエスカレーション(正準リスト)。ソロ選挙(subagent 2体)は本 intent では auto-solo-election 設定なしのため、ユーザーが明示した場合のみ発動。
