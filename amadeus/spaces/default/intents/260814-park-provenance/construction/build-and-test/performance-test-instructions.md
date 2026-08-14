# Performance Test Instructions — 260814-park-provenance

## 判定: 適用可能な performance NFR が存在しない

`requirements.md` の NFR は認可不変条件 / TDD / 台帳 resync / 既存検証集合のみで、数値目標を持つ性能要件は宣言されていない。変更は park ガード1点 + presence resolution 1行で、性能面の実装なし。目標なきベンチマークは生成しない(`cid:build-and-test:c2-no-test-theatre-for-absent-nfr`)。反転条件: park/presence 走査に実行時間の数値目標が NFR として宣言された場合。
