# Tech Stack Decisions — U3 u3-runner-gen-plugin

上流入力(consumes 全数): technology-stack.md(Bun/ESM 現行)、business-logic-model.md(3層)、business-rules.md(BR-U3-2/BR-U3-6)、requirements.md(FR-4d)。追加参照: 同 Unit FD の domain-entities.md(GraphStage 拡張の正本)

## TS-U3-1: 追加依存なし

graph 焼き込み・runner 生成・spawn はすべて既存ツール(amadeus-graph.ts / amadeus-runner-gen.ts / spawnSync)の拡張のみ(technology-stack.md 現行スタック、business-rules.md BR-U3-2 のテンプレート1定義)。

## TS-U3-2: テスト層とfixture

compose 済みホスト模擬 fixture は integration 層の実 FS tmp ホスト(business-rules.md BR-U3-6、requirements.md FR-4d)。graph 焼き込みの判定は exported 純関数で unit 層(business-logic-model.md compile 層の焼き込み条件 — domain-entities.md の additive schema 前提)。
