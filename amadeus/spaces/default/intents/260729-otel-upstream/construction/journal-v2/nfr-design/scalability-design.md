# Scalability Design — U3: journal-v2

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

scalability-requirements.md の要件（行数・shard 数の増大に対する merge/reader の振る舞い）に対する設計。codec 層に配信・同時実行・ストレージ階層の概念は持たせない。

## 行数・shard 数スケールの設計

- merge は dedup Map＋1 回ソートのみで O(N log N)・メモリ O(N) とし、record 数の 2 乗に比例する走査（全組合せ比較・ネストした dedup）を実装に持ち込まない
- merge 結果・計算量は総行数のみに依存させ、shard 数に 2 次的に依存しない。fork lineage token による (cloneId, seq) 一意性で採番協調・shard 間調停を設計上不要とする（BR-3/BR-4、business-logic-model.md § mixed shard merge）

## ストリーミング性の設計

- reader は行単位で decode し、shard 全体の 2 周走査や全行の不要な再保持をしない。戻り値は record 列 1 本（判別ユニオン `JournalRecord`）とする
- View は merge 済み record 列を 1 回走査して描画し、描画時に record を変換・再帰参照しない（BR-12）

## 検証設計

- 行数倍々の合成 shard ベンチで計算量曲線を確認し、shard 数を変えた property test で結果同値を固定する
- v1 実 fixture（現行 Intent 群）の decode 回帰で reader のストリーミング性を固定する

## 非目標

- 水平分散・永続キュー・外部ストレージはスコープ外（technology-stack.md: HTTP server／DB なし）。shard 永続化・rotation は呼出し側（U4・U11）の責務
