# Performance Design — leader-sync-tool(U1)

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model — P-1/P-2(performance-requirements.md)を business-logic-model.md の verb フローへ落とす設計。実行系は tech-stack-decisions.md T-1(新規依存ゼロ)。

## 設計

- PD-1: status/plan は一次走査のみ(応答性の実装形 — 走査計画の詳細は scalability-design.md SCD-1 へ一本化し、本項は P-1 の対話的応答水準を支える「余分な走査をしない」方針のみを定める。reviewer Minor 指摘で重複設計を解消)。
- PD-2: create の対象 copy は cp 相当の逐次 I/O(SYNC_SPLIT_FILE_LIMIT=300 が単一実行上限 — performance-requirements.md P-1 のガード兼務)。
- PD-3: 計測は B&T の wall-clock 記録のみ(閾値化しない — SLO 不在の N/A 設計を維持、security/reliability 側の loud 化と混同しない)。

## 検証接続

- PD-1/PD-2 は corpus sweep(BR-7)実行時の wall-clock 記録で観測、PD-3 の非閾値方針は build-test-results の判定分離に従う。
