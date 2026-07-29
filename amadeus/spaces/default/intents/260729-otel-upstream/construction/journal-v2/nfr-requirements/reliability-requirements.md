# Reliability Requirements — U3: journal-v2

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

本 Unit の信頼性要件の中核は durability（no-loss／exactly-once の merge 意味論）、mixed-shard merge の決定性、schema v2 後方互換の3点である。

## 耐久性（no-loss／exactly-once）

| 項目 | 目標 | 検証方法 |
|---|---|---|
| no-loss | 任意の v1/v2 混在 shard 集合に対し、merge は decode 可能な全 record を欠落なく返す。dedup 以外の経路で record を落とさない（BR-5、FR-JRN-2） | property test: 入力 record 多重集合と merge 出力の差分が dedup 除去分のみであることを検証 |
| exactly-once | 同一 idempotency key（v1: `intentId:cloneId:seq`、v2: `idempotencyKey`）を持つ重複 record は merge 出力に1件のみ残る。重複 shard を含めても結果が単一化する | property test: 重複 shard の merge 冪等（`merge(merge(x)) ≡ merge(x)`） |
| 変換の冪等性 | `convertV1ToV2` は idempotency key を保存し、変換前後の混在入力を merge しても重複しない（BR-9） | converter round-trip property test（serialize → parse が恒等） |
| 変換対象外の明示 | raw（`event: null`）・`opaque` record は変換対象外とし、スキップ理由を明示して返す。黙った欠落にしない（BR-9） | スキップ理由返却の単体テスト |

## merge 決定性

- 順序根拠は timestamp 昇順＋idempotency key 辞書順 tie-break のみ。clone-local sequence を shard 間順序に使わない（BR-6）
- merge 出力は shard の投入順・clone 構成・実行回数に依らず byte 同一（順序不変性）。property test で投入順シャッフルによる同値を固定
- worktree shard は fork lineage token により (cloneId, seq) が fork 横断で衝突しない（BR-4）。衝突時の調停・再試行ロジックは設計上不要

## 後方互換（v1 reader 保持）

- reader-first: v2 writer 実装の有無に依存せず、v1-only shard で完全に動作する（FR-JRN-2）。v1 現行 shard の実 fixture 全行 decode を回帰テストで固定
- merge は v1/v2 混在のまま返し、暗黙の変換を行わない（BR-7）
- v1 reader は既存 Intent の retention 条件達成まで削除しない（FR-MIG-5）。本 Unit では v1 parse 経路を v2 と同等の第一級経路として維持する
