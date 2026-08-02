# Performance Test Instructions — 260802-scope-grid-face-sync

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 対象 NFR(bt-proportional-selection — 実在境界へ trace できる範囲のみ)

唯一の性能要件は「センサー実行が manifest の `timeout_seconds: 5` 内」(requirements NFR、code-summary.md 検証表)。

- 検証: shipped copy 経由でセンサーを実行し実測 — **40ms / budget 5000ms**(builder 実測、code-summary.md 転記)。5面×数ファイルの読取+比較のみで、負荷試験は対象 NFR が存在しないため生成しない(根拠: 本変更は CLI/データ面のみで常駐サービス・スループット要件なし)。

## 実測結果

- shipped copy(`.claude/tools/amadeus-sensor-self-scope-consistency.ts`)経由の実行: **40ms**(budget 5000ms、builder 実測を code-summary.md から転記)
- 比較対象の実データ規模: 共有 stage cell 128+prose 16 組(corpus sweep の非空虚性実測)— 規模に対して線形の読取+比較のみで、閾値超過の余地なし
