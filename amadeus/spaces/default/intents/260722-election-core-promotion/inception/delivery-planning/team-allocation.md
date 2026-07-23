# Team Allocation — チーム機能のコア昇格

> 上流入力(consumes 全数): unit-of-work、unit-of-work-dependency、team-practices(requirements / components / unit-of-work-story-map は bolt-plan 側で消費 — 本表は体制面のみ)

## 責務ベースの割当(cid:role-model、固定名・時刻確約なし — approval-handoff:c3)

| 責務 | 担い手 | 備考 |
|---|---|---|
| conductor | e6(本ディスパッチの継続) | per-unit ループ運転・swarm referee 消費・ゲート執行 |
| builder | swarm worktree サブエージェント(Bolt ごとに fan-out) | 同時アクティブ最大4の枠内(cid:parallel-bolts)。ディスパッチプロンプトに逸脱停止・同期完遂・worktree 限定の標準文言(c2/builder-prompt-sync-completion) |
| reviewer(§12a) | engine 宣言 reviewer(construction 各ステージの directive に従う) | 自己実装の自己レビュー禁止(cid:role-model) |
| PR レビュアー | 実装者以外の空きメンバー(作成者先行指名 — cid:pr-reviewer-nomination-creator-first) | Bolt PR ごと |
| 承認 | ユーザー(マージ承認 = no-AI-merge、ゲート承認 = 本セッション実 HUMAN_TURN) | 本 intent は選挙不実施 |

## スケジュール

時刻確約なし(イベント駆動 — Bolt gate 承認→次 Bolt)。ハードデッドラインなし(SD 確認済み)。
