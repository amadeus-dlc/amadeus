# Domain Entities — U6: journal-reader-swap

上流入力（consumes 全数）: unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md（すべて参照済み）

## JournalShard

audit JSONL の物理単位。per-clone／per-worktree に分割され、1 shard 内に v1／v2 record が混在しうる（FR-JRN-2）。

| 属性 | 説明 |
|---|---|
| shardPath | clone／worktree ごとの shard ファイルパス |
| records | v1／v2 混在の record 列（行単位で schema version を判別、BR-4） |
| cloneId | shard を生成した clone の identity（merge 時の出所識別） |

ライフサイクル: writer（U1/U4 側）が append → 本 Unit の共通 reader が read → retention 条件達成後に v1 record を含む shard は converter（U3）で v2 化され、v1 reader 削除（FR-MIG-5）へ至る。本 Unit は read のみ。

## JournalRecordV1（現行 schema）

現行 audit JSONL entry。schema version フィールドを持たないことが v1 の判別条件。フィールド定義は現行 writer の既存形式をそのまま踏襲し、本 Unit で再定義しない（差替えの不可視性、BR-2）。

## JournalRecordV2（FR-JRN-1 のフィールドリストどおり）

| 属性 | 説明 |
|---|---|
| schemaVersion | `2`。v1 との判別キー |
| eventId | event の一意 ID |
| sequence | clone-local sequence（merge 時の整列キー、BR-5） |
| timestamp | 記録時刻 |
| eventName | OTel event name（Registry 登録語彙） |
| attributes | typed attributes |
| intentId／spaceId／cloneId | intent／space／clone identity |
| traceId／spanId | Trace 相関 ID（v1 では欠損しうる、BR-8） |
| idempotencyKey | 冪等性キー（v1 では欠損しうる） |
| canonicalMarker | canonical／telemetry の区別（v1 では欠損しうる） |

## NormalizedJournalRecord（共通 reader の出力）

tool が消費する正規化形。tool が要求する属性集合（例: presence の session 情報、learnings の entry 本体）に schema version 差を吸収して写像する。v2-only 属性は optional とし、v1 由来 record では欠損を許容する（BR-8）。tool は本型のみに依存し、JournalRecordV1／V2 を直接参照しない（BR-1）。

## 関係

- JournalShard 1 — N（JournalRecordV1 | JournalRecordV2）
- 共通 reader: JournalShard N — merge → NormalizedJournalRecord N（clone／worktree 横断、FR-JRN-2）
- 消費者: doctor／recovery／presence／grant／merge／runtime graph／learnings の7 tool が NormalizedJournalRecord を読む（FR-JRN-4）
- U3 が codec・reader・merge・converter を所有し、本 Unit はその Interface の消費者として tool 側を差替える（unit-of-work.md U6 の依存関係どおり）
