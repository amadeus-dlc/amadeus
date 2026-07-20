# Scalability Requirements — U1 tie-choice-resolution

上流入力(consumes 全数): requirements.md、business-logic-model.md、business-rules.md、technology-stack.md(brownfield 条件付き consumes — codekb) — 規模軸は requirements.md NFR-3 の store 全数(実測 ref 併記様式)と business-rules.md の対象データから、単発 CLI 実行モデルは technology-stack.md と business-logic-model.md のフローから導出。

## 要求

| # | 要求 | 根拠 |
| --- | --- | --- |
| SC-1 | 対象データ規模は選挙 store 全数(実測 ref: 本 worktree 51本 / leader 62本 — NFR-3 と同一 ref)。hold-resolved は選挙1件への単発 CLI 実行であり、store 本数へのスケール依存なし | requirements.md NFR-3 |
| SC-2 | choices 数の上限は設けない(実測 2〜4件、BR-2 の valid 列挙は choices 数に線形 — 列挙が長大化する規模では選挙設計自体が先に破綻するため上限発明をしない) | business-rules.md BR-2 |
| SC-3 | サービス SLO は N/A — 常駐 service/SLI 不存在(observability-setup:c3 の N/A 様式: 単発 CLI 実行、runtime service なし) | technology-stack.md(daemon 非追加方針) |
