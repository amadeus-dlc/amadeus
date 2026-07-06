# Architecture — 260705-rulesdir-resolve

上流入力: [Issue #491](https://github.com/amadeus-dlc/amadeus/issues/491)

## 対象経路の構造

`amadeus-graph.ts compile` は次の 3 段で rules を焼き込む。

1. `rulesDir()`: AIDLC_RULES_DIR ?? ツール位置からの相対解決（バグ箇所。旧レイアウト前提の固定 2 階層上がり）
2. `loadRules()`: top-level（org/team/project）+ phases/ の 2 段走査。dir 不在なら []
3. compile 本体: 全 stage へ `resolveRulesForStage` で rules_in_context を割り当てて stage-graph.json を書く
