# Services — OTel Upstream 統合

上流入力（consumes 全数）: `requirements.md`、`architecture.md`、`component-inventory.md`、`team-practices.md`（参照済み）

本システムは常駐サービスを持たない CLI フレームワークであり、ここでの「サービス」は短命 process 内で協調する実行単位と、その間の永続化を介した協調を指す（`architecture.md` の現行構造を踏襲）。

## 実行単位とオーケストレーション

| 実行単位 | 責務 | 通信 | ライフサイクル |
|---|---|---|---|
| CLI tool process（tools/amadeus-*.ts） | 状態遷移・engine・gate 処理。canonical Event の主要 emit 経路 | 同一 process 内の直接呼出し（同期） | 短命。即時終了しても audit Event が残る（NFR-2） |
| hook process（hooks/amadeus-*.ts） | session lifecycle・presence。canonical Event も同一 Provider 経由で emit する | 同上。Context は subprocess inject（FR-TRC-5） | 短命 |
| subagent／子 process | Construction の Bolt・RE 等の並行作業 | W3C Trace Context を env 経由で継承 | 短命、worktree 隔離 |
| Relay flush（session-end trigger） | Local Signal Store → Collector への best-effort 転送 | 非同期・失敗許容（FR-RLY-3） | session 終了時のみ |

## オーケストレーション方針

- **choreography（イベント駆動）**: canonical Event の発行と永続化は各 process が Provider 経由で自律的に行い、中央調停を持たない。状態機械の正本は audit JSONL（Journal）で、状態遷移は既存どおり tool 経由の同期手続き
- **orchestration（既存維持）**: ワークフロー遷移そのものは従来どおり conductor → engine（`amadeus-orchestrate.ts`）の forwarding loop が所有し、本取り組みはこの構造を変えない

## 通信契約

- **canonical 経路**: `emitEvent` → Logger Provider → AuditLogExporter → audit JSONL。同期・例外伝播・latch 連動（FR-EVT-2/3/4）。Event emit 完了時に reader から観測可能（FR-JRN-3）
- **telemetry 経路**: Span／Metric／diagnostic Log → 各 Local Exporter → 各 Store。fail-open（FR-EVT-6）
- **Relay 経路**: Store → OTLP → Collector。best-effort。audit JSONL は入力にしない（FR-RLY-2）

## スケーリング特性

- 複数 clone／worktree からの並行書き込みは現行どおり per-clone shard＋mkdir lock で制御し、mixed schema merge（FR-JRN-2）で統合する。Exporter 層は新たな共有状態を導入しない（latch は process-local に限定、FR-EVT-4）
