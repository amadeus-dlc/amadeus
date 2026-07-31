# Business Rules — U3: journal-v2

上流入力（consumes 全数）: unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md（すべて参照済み）

## 不変条件（v2 codec・record）

- BR-1: v2 record の必須フィールドは schema version・event ID・clone-local sequence・timestamp・OTel event name・typed attributes・intent/space/clone identity・trace/span IDs・idempotency key・canonical marker。欠落は `JournalCodecError` で拒否する（FR-JRN-1）
- BR-2: wire 不変条件は v1 codec を踏襲する — 1 logical record は常に1物理行、値に生の CR/LF を含まない、キー順固定で byte 同一 serialize（FR-JRN-1）
- BR-3: clone-local sequence は shard 内で1始まり単調増加。shard 間で一意であることは clone identity（worktree は fork lineage token）によって保証され、採番側の協調を必要としない（FR-JRN-2）
- BR-4: worktree（Bolt）は main clone の shard FILE に追記しつつ、自行の cloneId には決定的 fork lineage token を刻み、(cloneId, seq) の一意性を fork 横断で維持する（現行 `forkLineageCloneId` の設計を v2 でも維持）（FR-JRN-2）

## merge・reader の条件付き振る舞い

- BR-5: merge の dedup キーは idempotency key（v1 は `intentId:cloneId:seq`、v2 は record の `idempotencyKey` フィールド）。同一 key の record はどれか1件のみ残る（FR-JRN-2）
- BR-6: merge の順序根拠は timestamp 昇順＋idempotency key 辞書順 tie-break。clone-local sequence を shard 間順序に使ってはならない（clone 間で seq 空間が独立のため）（FR-JRN-2）
- BR-7: merge は v1/v2 混在のまま返し、暗黙の変換を行わない。v2 への正規化が必要な利用者（View・将来の v2-only 読者）は converter を明示的に通す（FR-JRN-2, FR-JRN-5）
- BR-8: converter は v1 の `event`／`fields` を OTel event name／typed attributes へ写像し、v1 に存在しない trace/span IDs は null とする。推測や合成で埋めない（FR-JRN-1）
- BR-9: converter は idempotency key を保存する（変換前後で重複判定が成立する冪等変換）。raw（`event: null`）・`opaque` record は変換対象外で、スキップ理由を明示して返す（FR-JRN-2）
- BR-10: reader は schema version ≤ 現行のみ受理し、将来 version は拒否する。行の decode 失敗は黙って捨てず、位置情報つきで呼出し側へ報告する（FR-JRN-2）

## View の条件付き振る舞い

- BR-11: human-readable View の入力契約は v2 record のみ。v1 混入入力は converter で正規化してから描画する（FR-JRN-5）
- BR-12: View は表示専用で、描画のために record を書き換えたり Journal へ追記したりしない（読取専用経路）（FR-JRN-5）
