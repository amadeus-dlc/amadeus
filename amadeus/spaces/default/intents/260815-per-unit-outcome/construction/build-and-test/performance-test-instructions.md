# Performance Test Instructions — intent 260815-per-unit-outcome

## 判定: 適用可能な NFR が存在しない(検査は生成しない)

- 根拠: requirements.md の NFR 節に性能目標(数値閾値・時間窓)は宣言されていない。本修正は `next` 1 実行内の監査読取/追記の追加であり、承認済み NFR へ trace できる性能検査対象が存在しない
- ノルム: 合否を決める数値目標が要件にないテスト種別は体裁のために実体を作らない(cid:build-and-test:c2-no-test-theatre-for-absent-nfr)。目標なきベンチマークは検証劇場
- 将来この判定を覆す条件: 監査シャード規模に対する `next` の応答時間 NFR が要件へ宣言された場合(そのときは timing シーム + カウンタ検証で構成する — bt-timeout-verification-shape)
