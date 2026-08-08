# Domain Entities — u6-plugin-docs-drift

上流入力(consumes 全数): requirements.md(FR-6a/6b)、components.md(C6 の plugin 文書2点)、component-methods.md(u6 は method 変更なし — 文書のみの確認)、unit-of-work.md(u6 境界 = plugins/*/stages/*.md 2ファイル)、unit-of-work-story-map.md(物語「opt-in ステージの起動挙動を文書が正しく説明する」)、services.md(u6 はサービス変更なし — 記述整合のみ)。

## 対象エンティティ(文書 — コード変更なし)

### PluginStageDoc(2ファイル)

- `plugins/formal-model-check/stages/formal-model-check.md:27` — 現行文言「Amadeus never runs it automatically: the engine only emits a spec-hash advisory nudge…」
- `plugins/pr-convergence/stages/pr-convergence.md:27` — 現行文言「…and Amadeus never runs it automatically.」

## 正しい挙動の記述モデル(3分岐 — 実装 `amadeus-advisory-choice.ts:521,:576-586` の記述)

| autonomy mode | advisory の解決 |
|---|---|
| none | 人間が起動判断(advisory は提示のみ) |
| semi / full | advisory は `question` occurrence として5段梯子に掛かり、`run-now` が選ばれれば無人で起動しうる(#2318) |

- 不変条件: `scopes: []`(stock workflow 非所属)の記述は正しいまま維持。文書は実装の記述であり新挙動を発明しない(FR-6b: 新 occurrence kind を追加しない)
- 本 intent 実走行の裏付け: requirements-analysis / functional-design の両 checkpoint で semi 梯子が advisory を run-now に自動選択した実測(2026-08-07、audit shard 記録)
