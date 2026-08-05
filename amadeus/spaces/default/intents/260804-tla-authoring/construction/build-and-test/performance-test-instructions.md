# Performance Test Instructions — 260804-tla-authoring

上流入力(consumes 全数): 各 unit の code-generation-plan.md と code-summary.md(承認済み NFR への trace 実測)。

## 比例選定(Comprehensive 下でも NFR trace 範囲のみ)

本 intent の承認済み NFR に常駐 service 性能要件はなく、負荷試験・auto-scaling 検査は生成しない(既定ノルム: 戦略名だけで検査を機械追加しない)。性能面で trace 可能な検証は次の2点のみ:

1. spawnEvaluator の timeout 60_000ms / maxBuffer 8MB(U2 — 宣言駆動 advisory の停止ガード。タイミングシームで決定的に検証済み、実時間待機なし)
2. TLC 実行の有限探索完走(NFR-001 決定性): advisory 相関 run で FormalElection 3.4M+ states / MirrorLifecycle 111k+ states の完走統計を実測(construction/formal-model-check/advisory-run-note.md 転記)

## 生成しなかった検査(根拠付き)

負荷試験・auto-scaling・実時間ソーク試験は生成しない — 承認済み NFR に常駐 service 性能要件が存在せず、戦略名(Comprehensive)だけを根拠に検査を機械追加しない(既定ノルム)。本節がその明記であり、省略の無音化はしない。
