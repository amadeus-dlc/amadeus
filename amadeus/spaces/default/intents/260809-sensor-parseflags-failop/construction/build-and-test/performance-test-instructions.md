# Performance Test Instructions — 260809-sensor-parseflags-failop

上流入力(consumes 全数): code-generation-plan.md(実装ステップと検証手順の宣言元)/ code-summary.md(実装面・検証実測の正本)。

## 適用外の根拠と既存面

**適用外(根拠付き)**: 本 intent は性能 NFR を持たない(requirements.md の NFR は drift/coverage/CI green のみ)。Comprehensive test strategy 下でも、承認済み NFR と実在境界へ trace できない性能試験は新設しない(bt-proportional-selection / c4)。患部(argv parse)は起動時1回の O(argv長) 処理で、既存の ReDoS 線形性規範の対象となる不定長入力 regex も追加していない。既存面: センサー実行時間は t488/t514 等の integration 実行で観測される。

## 参照

- 結果の正本: build-test-results.md(本ステージ内)
