# Performance Test Instructions — 260726-promote-self-hooks

上流入力 (consumes 全数): code-generation-plan.md, code-summary.md

## 適用判定

**該当なし (Not Applicable)。** bugfix スコープは nfr-requirements / nfr-design を実行しないため NFR 性能要件の成果物が存在せず、Comprehensive 戦略の条件節「IF NFR performance requirements exist」に該当しない。

## 補足

本変更の性能影響は定数的 (apply 経路に1回の設定ファイル読み書きが増えるのみ) で、計測対象となるワークロードを持たない。promote-self --apply の実行時間は dist 同期が支配的であり、マージステップの追加による劣化は無視できる。
