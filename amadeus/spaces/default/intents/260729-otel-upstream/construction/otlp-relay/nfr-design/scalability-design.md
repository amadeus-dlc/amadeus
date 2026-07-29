# Scalability Design — U11: otlp-relay

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

scalability-requirements.md の関心（Store 増大に対する bounded な振る舞い）に対する設計。長命サービスのような throughput スケーリングは設計対象にしない。

## bounded 処理の設計

- cursor 以降の record を `batchSize` 上限で分割処理し、未送信 record が増大しても 1 flush あたりの読取量は batchSize で上限付きとする。残りは次回 flush の retry 対象（BR-7）
- batchSize・retention 期限の具体値は既存 Projector の既定値を踏襲し、Phase 1 計測後 ADR で確定する

## 並行 flush の抑止設計

- lock/retry 機構（旧 Projector 維持）により並行 flush を防止する。lock 取得失敗は待機なしで即時終了し、lock 保持状態での強制取得・再試行ループを持たない（BR-9、FR-RLY-1）
- lock 競合 fixture で単一 flush のみ実行されることを検証する

## Store サイズの収束設計

- retention 期限超過かつ送信済み record を除去し、rotation で Store ファイルを分割する。cursor 未通過分は除去しない（BR-11、FR-RLY-1）
- retention/rotation fixture で未送信 record 保持を検証する

## 重複許容の設計

- at-least-once 再送による重複は idempotency 記録で検出・追跡し、Collector 側の重複取込を許容する。exactly-once を見せかける機構（送信側での重複排除・分散トランザクション）は持たない（BR-8）
