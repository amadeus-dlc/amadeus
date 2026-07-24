# Team Allocation — 260722-tla-plugin

上流入力(consumes 全数): requirements、components、unit-of-work、unit-of-work-dependency、unit-of-work-story-map、team-practices

## 体制(ソロモード)

- 実行形態: ソロモード(AMADEUS_OPERATING_MODE 未設定)。conductor(本セッション)が leader/conductor/builder/reviewer の責務を工程ごとに順次担う
- code-generation: swarm(prepare → 並列 fan-out → check → finalize)を既定とし、worktree 分離の subagent builder を Unit ごとにディスパッチ(同時アクティブ builder は最大4 — 既決)。Bolt 1 は単一 Bolt 内 2 Unit(U1→U3 直列依存)のため直列実施
- レビュー: §12a reviewer subagent(独立コンテキスト)+ conductor の裏取り再実行(evidence-discipline)。自己実装の自己レビューは reviewer subagent で分離
- 人間(ユーザー): 全ステージゲート・Bolt 1 ゲート・ladder 選択・PR マージ承認・仕様変更裁定

## スケジュール

期限なし(scope Q3 裁定)。Bolt 順序は bolt-plan.md の依存準拠。Team Formation は SKIP のため、named mob・カレンダーコミットは設けない(捏造しない — 既決 c3)。
