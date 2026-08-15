# Performance Test Instructions — 260814-priority-bug-batch

## 判定: 適用可能な NFR が存在しない(性能テストは生成しない)

- 根拠: requirements.md NFR-1 が「本バッチは性能目標を新設しない」と宣言。削除した t07 の 300/500ms 予算に trace できる NFR の不在は RE で全域 grep により確認済み(#3035 クロスレビュー2名も独立確認)
- ノルム: `cid:build-and-test:c2-no-test-theatre-for-absent-nfr` — 合否数値目標が要件に宣言されていないテスト種別は体裁のために実体を作らない(目標なきベンチマークは検証劇場)
- この判定を覆す条件: skip path 等のレイテンシ目標が要件として宣言されたとき(その際は `bt-timeout-verification-shape` に従い実時間負荷試験でなくタイミングシーム+カウンタで構成)
