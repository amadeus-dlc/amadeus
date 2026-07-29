# Domain Entities — U11: otlp-relay

上流入力（consumes 全数）: unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md（すべて参照済み）

## Cursor（送達位置）

`flushSignals({ since?: Cursor })` が受け取る読取開始位置。Store ごとに保持する。

| 属性 | 説明 |
|---|---|
| storeId | 対象の Local Signal Store（span／metric／log） |
| position | 最後に送信成功が確認できた record の位置（BR-7） |
| updatedAt | cursor 更新時刻 |

ライフサイクル: 初回 flush 時に生成 → 送信成功ごとに前進 → 失敗時は不変（BR-7）。永続化し、次回 session-end flush が引き継ぐ。

## RelayResult（flush の結果）

`flushSignals(): Promise<RelayResult>` の返却値。

| 属性 | 説明 |
|---|---|
| sent | 今回送信に成功した record 数 |
| skipped | Collector 不在等で送信しなかった record 数（失敗扱いにしない。FR-RLY-3） |
| cursorAdvanced | cursor が前進したかどうか |
| diagnostics | 失敗理由等の診断情報（ログ・メトリクス用。例外は伝播させない） |

## SignalStoreRecord（読取対象）

Span Store・Metric Store・Log Store の JSONL 1行。U1/U9/U10 が出力した完成済み record を読むだけで、生成・推測・属性付加は行わない（BR-1/BR-2/BR-11）。

| 属性 | 説明 |
|---|---|
| storeId | 出自の Store |
| payload | Store record 本体（OTLP 変換の入力） |
| traceId／spanId | 相関 ID（OTLP 変換時にそのまま引き継ぐ） |

## OTLP Batch（送信単位）

| 属性 | 説明 |
|---|---|
| records | batchSize までの変換済み record 群 |
| endpoint | ローカル Collector の送信先（auth header なし。NFR-4） |

## IdempotencyRecord（重複検出・追跡）

| 属性 | 説明 |
|---|---|
| key | record 由来の冪等キー |
| sentAt | 送信成功時刻 |

再送時に Collector 側・Relay 側で重複検出・追跡のための記録（完全な排除は保証しない、BR-8 の重複許容設計と整合）（BR-8）。

## 関係

- Cursor 1 — 1 SignalStore（storeId 単位で送達位置を管理）
- flush 1回 — N SignalStoreRecord → 1..N OTLP Batch → N IdempotencyRecord
- audit JSONL（CanonicalEventRecord）は本 entity 群のいずれとも参照関係を持たない（BR-2）
