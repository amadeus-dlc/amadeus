# Performance Test Instructions — 260814-ambient-error-sink

## 判定: 適用可能な NFR が存在しない(N/A)

requirements に性能 NFR は宣言されていない(NFR は監査・state 純度と CLI 互換のみ)。目標なきベンチマークは検証劇場のため生成しない(cid:build-and-test:c2-no-test-theatre-for-absent-nfr)。

## 覆す条件

入口ガードの実行時間等に数値目標を持つ NFR が要件へ宣言された場合、その NFR へ trace できる範囲で実体化する。
