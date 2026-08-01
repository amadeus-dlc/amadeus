# Performance Test Instructions — 260801-otel-meta-schema

上流入力(consumes 全数): 各 unit の code-generation-plan.md(全6 unit — 実行形態と経過の正本)と code-summary.md(全6 unit — 変更面・検証実測・PR 着地の正本)(検証形の実施実績)、nfr-design performance-design(counter assert / 実時間非依存)、requirements.md NFR-3 — Comprehensive 戦略でも承認済み NFR へ trace できる範囲のみ生成(bt-proportional-selection)。

## 実施範囲(NFR trace)

- resolver/resource の memo 1回性: counter assert(t-otel-span-context の memo 3性質 / t-otel-resource の buildResource 回数)— 実時間待機なし(bt-timeout-verification-shape)
- redactStacktrace の線形性: 入力サイズスイープ(12.5KB〜100KB、上限 assert)— regex-linearity-untrusted-input の完成条件
- 負荷試験・auto-scaling 系は非適用(常駐 service 不在 — nfr-design:c1)。根拠付き不生成

## 判定

counter/スイープの決定的テストが --ci スイートに包含され green(build-test-results.md 参照)。実時間待機を伴うテストは存在しない。
