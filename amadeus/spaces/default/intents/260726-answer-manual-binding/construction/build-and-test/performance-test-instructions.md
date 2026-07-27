# Performance Test Instructions — 260726-answer-manual-binding

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(いずれも construction/fix-answer-manual-binding/code-generation/ — 検証対象・実測 exit code・逸脱裁定の導出元)。

## 比例選定(Minimal)

本変更は answer 経路の制御フロー修正(補填+consume)で、承認済み性能 NFR・実在境界への trace なし → 新規性能試験は生成しない。既定 CI の性能契約群は run-tests.sh --ci に含まれ green。

## 根拠

code-generation-plan.md の Steps に性能要件なし。consume 追加は state 再読1回で計算量クラス不変(code-summary.md の変更規模 +59/-16)。
