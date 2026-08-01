# Performance Test Instructions — 260801-open-bug-batch-5

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

- NFR-3(requirements)どおり、本 intent の追加テストはすべて unit/integration 帯で実時間ベンチマークを持ち込まない — 各 unit の code-generation-plan.md のテスト計画で確認済み。

## 対象範囲の導出

比例選定(cid:build-and-test:bt-proportional-selection): 性能検査は承認済み NFR と実在境界へ trace できる範囲だけ生成する。本 intent の NFR-3 は「持ち込まない」方向の制約であり、trace 先は「追加テストの層配置」と「CI ステップの軽量性」の2点に限られる。

## 判定

- 専用性能テストの新設: **N/A**(反証可能な根拠 — perf tier 分離直後の retrograde 禁止が NFR-3 で明文化されており、9修正はいずれも正しさ系欠陥で性能要件を持たない)。
- FR-7 の CI `compile --check` ステップは実測 ~1秒(builder 実測)で NFR-3 の軽量条件を充足。
- 既存 perf tier(tests/perf/、perf.yml daily)は本 intent 無改変 — 退行監視は既存機構に委ねる。
