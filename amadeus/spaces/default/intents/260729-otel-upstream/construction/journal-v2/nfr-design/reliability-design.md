# Reliability Design — U3: journal-v2

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

reliability-requirements.md の中核（no-loss／exactly-once の merge 意味論・merge 決定性・v1 後方互換）に対する設計。

## merge 意味論の設計

- no-loss: merge は decode 可能な全 record を欠落なく返す。dedup 以外の経路（変換・フィルタ・暗黙の型絞り込み）で record を落とさない（BR-5、FR-JRN-2）
- exactly-once: 同一 idempotency key の重複 record は merge 出力に 1 件のみ残す。dedup は Map による key 一致のみで、近似一致・時刻近接による間引きを行わない
- 変換の冪等性: `convertV1ToV2` は idempotency key を保存し、変換前後の混在入力の merge で重複しない（BR-9）
- raw（`event: null`）・`opaque` record は変換対象外としてスキップ理由を明示して返し、黙った欠落にしない（BR-9）

## 決定性の設計

- 順序根拠は timestamp 昇順＋idempotency key 辞書順 tie-break のみ。clone-local sequence・shard 投入順・clone 構成・実行回数に依存する順序付けを持たない（BR-6）
- merge 出力は byte 同一であることを property test（投入順シャッフル同値・`merge(merge(x)) ≡ merge(x)` 冪等）で固定する

## 後方互換の設計

- reader-first: v2 writer の有無に依存せず v1-only shard で完全に動作する。`parseJournalLine` の v1 経路を v2 と同等の第一級経路として維持する（FR-JRN-2）
- merge は v1/v2 混在のまま返し、暗黙の v1→v2 変換を行わない（BR-7）
- v1 reader は既存 Intent の retention 条件達成まで削除しない（FR-MIG-5、削除判定は U8 の責務）
- 全検証はテスト先行（property test を先に失敗させる同一コミット red-green）で実施する（business-logic-model.md § 検証フロー、VER-3）
