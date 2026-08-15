# Performance Test Instructions — intent 260815-stale-epoch-landed

## 判定: 適用可能な NFR が存在しない(検査は生成しない)

- 根拠: requirements に性能目標の宣言なし(CLI 1 実行内の git fetch/merge-base 追加のみ)
- ノルム: cid:build-and-test:c2-no-test-theatre-for-absent-nfr。覆す条件: 収束 CLI の応答時間 NFR が要件へ宣言された場合
