# Intent Backlog — 260731-perf-ci-separation

上流入力(consumes 全数): intent-statement.md

intent-statement.md の Success Metrics から proto-Unit を導出し、MoSCoW + 依存順で並べる。

## Proto-Units(依存順)

| # | Proto-Unit | MoSCoW | 依存 | 概要 |
|---|---|---|---|---|
| P1 | perf tier 新設(run-tests.ts) | Must | なし | perf テスト分類機構+`--perf` 実行経路+`--ci`/`coverage:ci` からの除外 |
| P2 | perf.yml 新設 | Must | P1 | daily schedule + workflow_dispatch、bun test perf 層の実行 |
| P3 | distribution-benchmark 移設 | Must | P2 | ci.yml から perf.yml へ。distribution-required から PERFORMANCE_RESULT を除去 |
| P4 | #1830 経路A 是正(t258 timeout) | Must | P1 | 120s timeout のランナー頑健化(方式は design で確定) |
| P5 | coverage registry / gate 同期 | Must | P1 | 除外後の registry 再生成、patch/project gate 整合 |
| P6 | docs 同期 | Should | P1-P3 | CI 構成記述の更新(全域 grep 棚卸し) |

## シーケンス選好

**dependency-first**(P1 が全ての前提)。P4 は P1 と独立に着手可能だが、perf.yml 上での動作確認は P2 後。ハードデッドラインなし。

## 検証の引き継ぎ台帳(無音喪失防止)

ci.yml から外れる検証は全数 perf.yml で引き継ぐ。移設対象の全数列挙は design ステージの実測棚卸し(grep)で確定し、この台帳を requirements で固定する。
