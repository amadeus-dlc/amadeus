# Services — swarm-dispatch-enum(Issue #1157)

上流入力(consumes 全数): `requirements.md`、`architecture.md`、`component-inventory.md`、`team-practices.md`。

## サービス構成(変更なし)

本 intent はランタイムサービスを追加しない。`architecture.md` の既存オーケストレーション(engine → conductor → referee)を維持し、driver 選択の一段のみを差し替える。

## オーケストレーション(orchestration 型 — 中央は conductor)

1. engine(`amadeus-orchestrate.ts`)が `{"kind":"invoke-swarm","units":[...]}` directive を emit(不変 — driver 選択を持たない)
2. conductor が `amadeus-swarm.ts resolve --harness <self>`(Q1 裁定 A)を実行し、FR-1 表に従い fan-out 方式を確定
   - rejected → 即停止(副作用ゼロ — FR-2)
   - degraded → 利用者表示+native floor
3. fan-out: Claude=N 並列 Task / Claude ultra=Dynamic Workflow / Codex=native subagent 並列(FR-5、C-13 evidence 済み)/ Kiro 系=既存 native floor
4. referee lifecycle(prepare → check → finalize)は意味論不変(FR-7)。degraded 時のみ `--degraded-from` が prepare へ渡り `SWARM_DEGRADED` が刻まれる(FR-3)

## 通信契約

- conductor↔referee: 既存 CLI(stdout JSON / exit code)のみ。新規 IPC・メッセージング基盤なし(scope Won't — Herdr 統合等の除外を承継)
- Codex native fan-out: セッション内 spawn/回収(C-17: slot < batch 時は wave/逐次を許容し正しさは並行度に非依存。詳細は FD)

## ライフサイクル・スケーリング特性

- referee はステートレス(状態ファイルなし — RE 実測)を維持。並行度は `--concurrency` の既存契約のまま
