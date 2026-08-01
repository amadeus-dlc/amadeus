# Scalability Requirements — U3: journal-v2

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

codec 層に配信・同時実行・ストレージ階層の概念はないため、スケーラビリティは「shard 総行数・shard 数の増大に対する merge/reader の振る舞い」に限定する。

## 目標

| 項目 | 目標 | 検証方法 |
|---|---|---|
| merge の行数スケール | shard 総行数 N に対し O(N log N)・メモリ O(N)（dedup Map＋1回ソートのみ）。record 数の2乗に比例する走査を禁止 | 行数を倍々にした合成 shard のベンチで計算量曲線を確認 |
| shard 数スケール | clone／worktree 数（shard 数）の増加に対し、merge 結果・計算量は総行数のみに依存し shard 数に2次的に依存しない（BR-3/BR-4 の一意性保証により採番協調・shard 間調停は不要） | shard 数を変えた property test で結果同値を確認 |
| reader のストリーミング性 | reader は行単位で decode し、shard 全体の2周走査や全行の不要な再保持をしない。戻り値は record 列1本 | v1 実 fixture（現行 Intent 群）の decode 回帰 |
| View の入力規模 | View は merge 済み record 列を1回走査して描画する（BR-12、読取専用）。描画時に record を変換・再帰参照しない | merge と同順序での描画結果テスト |

## 非目標の根拠

- 水平分散・永続キュー・外部ストレージは短命 CLI プロセス前提の本プロジェクトのアーキテクチャ上スコープ外（technology-stack.md: HTTP server／database なし）。shard 永続化・rotation は呼出し側の責務であり本 Unit では扱わない
