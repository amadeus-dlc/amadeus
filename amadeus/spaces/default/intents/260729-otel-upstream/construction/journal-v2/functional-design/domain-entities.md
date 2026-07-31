# Domain Entities — U3: journal-v2

上流入力（consumes 全数）: unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md（すべて参照済み）

Journal Module（`amadeus-journal.ts` 拡張、ADR-5）のデータ構造。codec 層は filesystem に触れず、全 entity は immutable（readonly）とする。

## JournalEntryV2（schema v2 record、FR-JRN-1）

| 属性 | 型 | 説明 |
|---|---|---|
| schemaVersion | number | 常に 2。reader の分岐キー |
| eventId | string | event の一意 ID（registry の RegisteredEventName と対応） |
| seq | number | clone-local sequence、shard 内1始まり単調（BR-3） |
| timestamp | string | ISO 8601 |
| eventName | string | OTel event name |
| attributes | Readonly<Record<string, unknown>> | typed attributes（v1 の文字列 fields から型付きへ） |
| intentId / space / cloneId | string | intent/space/clone identity（cloneId は worktree では fork lineage token、BR-4） |
| traceId / spanId | string \| null | Trace Context 相関。converter は v1 に無いため null（BR-8） |
| idempotencyKey | string | 全局一意の dedup キー（BR-5） |
| canonical | boolean | canonical marker（canonical Event と telemetry の区別） |

ライフサイクル: 生成（U4 の AuditLogExporter が emit 経由で採番）→ serialize → shard へ追記（append-only、更新・削除なし）→ reader で decode → merge → View 描画。

## V1JournalEntry（既存 `JournalEntry`、FR-JRN-2）

現行 `amadeus-journal.ts` の `JournalEntry` をそのまま再利用（schemaVersion・seq・cloneId・intentId・timestamp・heading・event・fields/rawBody・opaque）。reader 互換のため変更しない。idempotency key は導出値 `intentId:cloneId:seq`（現行 `journalEntryId`）。

## JournalRecord（reader 出力の判別ユニオン、FR-JRN-2）

`JournalRecord = V1JournalEntry | JournalEntryV2`。`parseJournalLine` が `schemaVersion` で分岐して返す。merge・doctor 等の利用者はこの union を受け、v2 前提の処理は converter で正規化する（BR-7）。

## MergedJournal（merge 出力、FR-JRN-2）

| 属性 | 説明 |
|---|---|
| records | dedup・順序付け済みの JournalRecord 列（v1/v2 混在可） |
| duplicatesDropped | dedup で除去した件数（監査可視性） |
| decodeErrors | 位置情報つき decode 失敗の列（黙殺しない、BR-10） |

## JournalView（pretty-print 出力、FR-JRN-5）

`renderJournalView(records: JournalEntryV2[]): string`。v2 record 列を人間可読テキストへ写す表示専用の射影。副作用なし（BR-12）。

## 関係

- V1JournalEntry →(converter) JournalEntryV2：冪等写像。idempotency key を保存し、raw/opaque は変換対象外（BR-9）
- shard N — N JournalRecord：per-clone shard（worktree は main の FILE に lineage token で追記）を merge が束ねて MergedJournal を生成
- JournalEntryV2 1 — 1 JournalView 行：View は record の射影であり、Journal 本体のライフサイクル（append-only）に影響しない
