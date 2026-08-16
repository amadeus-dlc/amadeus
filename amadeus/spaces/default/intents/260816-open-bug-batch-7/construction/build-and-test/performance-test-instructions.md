# Performance Test Instructions — 260816-open-bug-batch-7

## 判定: 適用可能な NFR が存在しない

requirements.md の非機能要件は既存 blocking gate の全通過・TDD 既定・push-first のみで、性能の数値目標(合否を決める閾値)を宣言する要件は存在しない。3 unit はテスト内ゲート・配布スクリプト・docs 面の修正であり、実行時性能の契約面を持たない。

ノルム(cid:build-and-test:c2-no-test-theatre-for-absent-nfr)に従い、体裁のための性能検査は生成しない。

- 根拠: requirements.md 非機能要件節の実読(性能閾値の宣言なし)
- 本判定を覆す条件: 将来、性能 NFR(数値目標つき)が要件へ追加された場合。その際は timing seam + カウンタ検証で構成する(cid:build-and-test:bt-timeout-verification-shape)
