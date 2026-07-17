# Performance Requirements — U4 verification-docs

intent: 260715-opencode-cursor-harness / Unit: U4
上流入力: functional-design(business-logic-model.md / business-rules.md)、requirements.md、codekb の technology-stack.md(Bun/TS スタック実測)。

## 要件

- PR-U4-1: smoke test は fs 直読のみ(spawn なし)で軽量 — 既存4層ランナーのタイムアウト予算内(専用数値なし、nfr-requirements:c3。fanout 直後の統合検証はホスト負荷収束を待つ — fanout-load-settle-before-integration)

## N/A(反証可能根拠付き)

- 実行時性能 SLO: N/A — テスト・docs のみ(runtime service 不在)
