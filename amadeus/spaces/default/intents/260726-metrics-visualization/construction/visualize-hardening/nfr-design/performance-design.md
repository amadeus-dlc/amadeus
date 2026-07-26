# Performance Design — U2 visualize-hardening

上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

## 設計

- U2-PERF-01(強調の定数時間性)の実現: regressionClass は最新2点のみ参照(business-logic-model.md 増分2)。履歴全走査を追加しない — U1 の単走査構造(reliability 面と共有)へ判定1回/キーを重ねるだけ
- U2-PERF-02(--check 同オーダー)の実現: --check は --write と同一の生成パス+Buffer 比較1回(business-logic-model.md 増分1)。比較専用の差分アルゴリズムは導入しない(バイト一致/不一致の2値で足りる)
- U2-PERF-03(CI 実測記録)の実現: Bolt 2 検証で --write の実測秒と timeout 枠(5分)比を記録(固定閾値なし — performance-requirements.md の規律)。記録先は Bolt 2 の検証記録(code-summary)

## 非対象

- 負荷試験・ベンチ基盤(performance-requirements.md 非対象。tech-stack-decisions.md の既存ランナー範囲)
