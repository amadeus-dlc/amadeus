# Scalability Requirements — U11: otlp-relay

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## 対象と非対象

本 Unit は短命 CLI process から session-end 時に単回起動される転送機構であり、長命サービスのような throughput スケーリングは設計対象にしない。スケーラビリティ上の関心は「Store 増大に対する bounded な振る舞い」に限定する。

## 目標

| 項目 | 目標 | 測定方法 |
|---|---|---|
| Store 増大への bounded 処理 | cursor 以降の record を `batchSize` 上限で分割処理し、未送信 record が増大しても 1 flush あたりの読取量は batchSize で上限付き。残りは次回 flush の retry 対象とする（BR-7） | 大量 fixture で batch 分割を検証 |
| 並行 flush の抑止 | lock/retry 機構（旧 Projector 維持）により並行 flush を防止。lock 取得失敗は即時終了で待機しない（BR-9、FR-RLY-1） | lock 競合 fixture で単一 flush のみ実行されることを検証 |
| Store サイズの収束 | retention 期限超過かつ送信済み record を除去し、rotation で Store ファイルを分割する。cursor 未通過分は除去しない（BR-11、FR-RLY-1） | retention/rotation fixture で未送信 record 保持を検証 |
| 数値上限 | batchSize・retention 期限の具体値は既存 Projector の既定値を踏襲し、Phase 1 計測後 ADR で確定 | ADR 入力として実測 |

## 制約

- at-least-once 再送による重複は idempotency 記録で検出・追跡し、Collector 側の重複取込を許容する設計とする（BR-8）。exactly-once を見せかける機構は持たない
