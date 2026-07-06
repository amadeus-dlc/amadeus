# Component Inventory — 260705-rulesdir-resolve

上流入力: [Issue #491](https://github.com/amadeus-dlc/amadeus/issues/491)

## 関連コンポーネント

- amadeus-graph.ts（本修正の対象）
- amadeus-runtime.ts（per-intent runtime graph。memory_path 解決は #457/#458 で修正済みの別経路 = 本 Intent のスコープ外）
- stage-graph.json の読み手: amadeus-orchestrate.ts（rules_in_context を directive へ供給）
