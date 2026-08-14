# Performance Test Instructions — 260814-t528-ambient-isolation

## 判定: 適用可能な NFR が存在しない(N/A)

本 intent の requirements(`inception/requirements-analysis/requirements.md`)に性能 NFR は宣言されていない。合否を決める数値目標が要件に存在しないため、性能テストは生成しない — 目標なきベンチマークは検証劇場であり、体裁のための実体は作らない(cid:build-and-test:c2-no-test-theatre-for-absent-nfr)。

## この判定を覆す条件

将来、t528 の実行時間・テストスイートの所要時間に数値目標を持つ NFR が要件へ宣言された場合、その NFR へ trace できる範囲で本ファイルを実体化する。

## 参考

テスト timeout は既存の `scaleTestTime(30000)` 契約(`TEST_TIME_FACTOR` 乗算)を維持しており、性能基準ではない。
