# Performance Requirements — U2 visualize-hardening

上流入力(consumes 全数): business-logic-model.md, business-rules.md, requirements.md, technology-stack.md

## 性能要件

- U2-PERF-01: 劣化強調(business-logic-model.md 増分2、business-rules.md ルール13 の固定列挙)の判定は最新値 vs 直前値の1比較/キーのみ — 全履歴走査を追加しない(線形性の維持、U1-PERF-02 の継承)
- U2-PERF-02: `--check`(増分1)は再生成+バイト比較で、`--write` と同オーダーの実行時間に収まる(requirements.md FR-1 の兄弟 CLI 様式 — 追加の性能予算は設けない)
- U2-PERF-03: CI 同乗(増分4)は metrics-snapshot job の timeout-minutes: 5 の枠内に収まる — 現行実データでの --write 実測時間と timeout 枠に対する実測比率を Bolt 2 の検証で記録する(固定閾値は置かない — U1-PERF-01 と同じ規律。technology-stack.md の Bun 直接実行前提)

## 非対象

- ベンチマーク基盤・負荷試験 — 承認済み NFR に trace しない検査は生成しない(bt-proportional-selection)
