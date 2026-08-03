# Team Allocation — record-roundtrip-pbt (#1980)

上流入力(consumes 全数): unit-of-work.md(Unit 規模 — 担当粒度の根拠)、unit-of-work-dependency.md(並行編成 — 同時稼働数の上限)、unit-of-work-story-map.md(価値の流れ — reviewer 割当の観点元)、requirements.md(C-1 TDD / C-3 ゲート)、components.md(Bolt 1 のみ core 接触という担当リスク配分の根拠 = U1 の所在・投影コスト)

## 運用モード

ソロモード(`AMADEUS_OPERATING_MODE=team` 未設定)。conductor(本セッション)が leader/conductor 責務を担い、実装は Bolt ごとに worktree 隔離の builder サブエージェントへディスパッチする(cid:requirements-analysis:subagent-utilization)。§12a レビューは reviewer サブエージェント(fresh)を各 Bolt で起こす。選挙は subagent-1/subagent-2 の auto-solo 形。

## 割当

| 役割 | 担当 | 備考 |
|---|---|---|
| conductor / leader | 本セッション | ゲート執行・選挙管理・PR 作成/収束・§13・チェックポイント |
| builder(Bolt 1〜6) | Bolt ごとの fresh coder サブエージェント(worktree 隔離) | ディスパッチプロンプトに逸脱停止・engine 操作禁止・同期完遂を明記(cid:code-generation:builder-prompt-sync-completion / deviation-stop-before-implement) |
| reviewer | Bolt ごとの fresh reviewer サブエージェント | 自己実装の自己レビュー禁止(builder と別個体) |
| 選挙投票者 | subagent-1 / subagent-2(fresh) | auto-solo-election: true |

- 同時アクティブ builder は最大4(team.md parallel-bolts)。Bolt 2/3/4 の並行がその上限内。
- マージはユーザー承認後に conductor が実行(no-AI-merge / leader-executes-merge)。
- named mob・スケジュールの捏造はしない(cid:approval-handoff:c3 — ソロ運用の実態のみ記載)。
