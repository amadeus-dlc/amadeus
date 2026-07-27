# Performance Test Instructions — 260726-t258-p95-flake

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(いずれも construction/fix-t258-p95-flake/code-generation/ — 検証対象と実測 exit code の導出元)。

## 本 intent は性能ゲート自体の修正

t258/t257 の性能契約テストの**判定統計量**を p95→median へ変更(ユーザー承認済み契約変更 — code-summary.md 逸脱裁定の記録)。ベンチ構造(child spawn・100サンプル・warmup 10)は不変(NFR-2、diff 実測で確認)。

## 比例選定

新規の負荷試験は生成しない — 修正の狙いは判定の頑健化であり、実時間ベンチの追加は偽赤面を増やす方向のため(cid:build-and-test:bt-proportional-selection)。
