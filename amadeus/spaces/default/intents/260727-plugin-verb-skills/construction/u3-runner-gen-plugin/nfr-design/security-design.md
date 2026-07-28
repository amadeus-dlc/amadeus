# Security Design — U3 u3-runner-gen-plugin

上流入力(consumes 全数): security-requirements.md、performance-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 設計

SR-U3-1/SR-U3-2(security-requirements.md)の実現:
- 生成入力は stage-graph.json のみ(business-logic-model.md 生成層)— compose trust 検証後の compiled 断面。plugin 素材ディレクトリを runner-gen が直接読む経路を作らない
- 書込は runner-gen の既存書込面(skills/amadeus-<slug>/)のみ。slug は compiled graph 由来で、テンプレート(tech-stack-decisions.md TS-U3-1 の既存 renderStageRunner)への埋め込みは既存 stock 生成と同一機構

## 境界確認

- spawn 配線(reliability-requirements.md RL-U3-1)は固定 argv のみ(performance-requirements.md の同型 spawn)。scalability-requirements.md の N/A に影響なし
