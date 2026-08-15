# Performance Test Instructions — intent 260814-open-bug-batch-6

## 判定: 適用可能な NFR が存在しない(検査は生成しない)

- 根拠: 本 intent の requirements に性能目標の宣言なし(5 unit はセンサー宣言・docs 同期・record 最終化・調査・判定であり性能境界に非接触)
- ノルム: cid:build-and-test:c2-no-test-theatre-for-absent-nfr。覆す条件: 性能 NFR が要件へ宣言された場合
