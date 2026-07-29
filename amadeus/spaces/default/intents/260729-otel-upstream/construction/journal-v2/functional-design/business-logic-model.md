# Business Logic Model — U3: journal-v2

上流入力（consumes 全数）: unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md（すべて参照済み）

Journal Module（`packages/framework/core/tools/amadeus-journal.ts` の拡張、ADR-5）の codec・reader・merge・converter・View の処理系列。本モジュールは filesystem に触れない純粋な codec 層として設計し、I/O は呼出し側（U4 の AuditLogExporter・U6 の共通 reader）が担う（services.md の通信契約どおり）。

## 処理シーケンス

### v2 codec（serialize／parse）

1. `serializeJournalEntryV2(entry)` は v2 record の全必須フィールドを検証（不変条件違反は `JournalCodecError`、BR-1/BR-2）
2. キー順を固定して JSON.stringify し、同一 record は常に byte 同一の1物理行を返す（現行 v1 codec と同じ wire 不変条件）
3. `parseJournalLine(line)` は行頭の `schemaVersion` を見て v1/v2 へ分岐し、対応する record 型を返す。未知の将来 version（> 現行）は拒否し、≤ 現行のみ受理（FR-JRN-2）

### v1/v2 reader

1. shard（JSONL 列）を行単位で読み、各行を `parseJournalLine` で decode
2. 戻り値は判別ユニオン `JournalRecord = V1JournalEntry | JournalEntryV2`。呼出し側は schemaVersion で絞り込める
3. reader-first: 本 reader は v2 writer 実装の有無に依存せず、v1-only shard でも完全に動作する（FR-JRN-2）

### mixed shard merge（clone／worktree 横断）

1. 全 shard の record を収集し、idempotency key（v1: `intentId:cloneId:seq`、v2: 同名型の `idempotencyKey`）で dedup（BR-5）
2. worktree 由来 shard は fork lineage token により (cloneId, seq) が衝突しないため、merge は key 一致による重複除去のみで成立する（現行 `forkLineageCloneId` の設計を v2 でも踏襲）
3. 順序付けは timestamp 昇順、同刻は idempotency key の辞書順で tie-break。clone-local sequence は shard 内単調であり shard 間の順序根拠には使わない（BR-6）
4. 出力は v1/v2 混在のまま返す。merge 時に暗黙の v1→v2 変換は行わない（BR-7）

### converter（v1 → v2）

1. `convertV1ToV2(entry)` は純粋関数。v1 の `event` を OTel event name へ、`fields` を typed attributes へ写像し、`canonical` marker・trace/span IDs（v1 に無い場合は null）を付与（BR-8）
2. 冪等性: `convertV1ToV2` は同じ idempotency key を持つ record を生成し、変換前後の merge dedup で重複しない（BR-9）
3. raw record（`event: null`）と `opaque` record は canonical event として表現できないため変換対象外とし、呼出し側へ明示的にスキップ理由を返す

### human-readable View／pretty-print

1. `renderJournalView(records)` は v2 record 列を受け、現行 Markdown 監査出力相当の人間可読テキストを生成する（FR-JRN-5）
2. 並びは merge と同一の決定的順序（timestamp＋key tie-break）。表示のために record を変換・再帰参照しない
3. v1 record が混入する入力は converter 経由で v2 へ正規化してから描画する（View の入力契約は v2 のみ）

## 検証フロー

1. テスト先行（#1678 の test-first 方針を踏襲、team-practices.md ## Testing Posture の同一コミット red-green）: property test を先に失敗させてから codec／merge を実装する
2. property test 群（mixed・clone・worktree ケース）:
   - 任意の v1/v2 混在 shard 集合で merge が全 record を欠落なく返す（no-loss）
   - 同一 idempotency key を持つ重複 shard を merge しても結果が単一化する（exactly-once）
   - merge の順序が shard の投入順に依存しない（順序不変性）
   - worktree fork lineage token 衝突なしで (cloneId, seq) 一意性が保たれる（BR-4）
   - `convertV1ToV2` → serialize → parse の round-trip が恒等（BR-9）
3. v1 現行 shard の実 fixture を読み、全行が decode 可能なことを固定する（reader-first の回帰）

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T08:42:16Z
- **Iteration:** 1
- **Scope decision:** none

READY: FR-JRN-1/2/5 fully covered by coherent rule/flow/entity set respecting tools→otel boundary; no invented APIs or ordering leaks.

### Findings

- None
