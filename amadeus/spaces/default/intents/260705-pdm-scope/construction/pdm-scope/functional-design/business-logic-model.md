# Business Logic Model — pdm-scope

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 変更のモデル

実行時ロジックの追加はない。scope はデータ（grid）と定義ファイルであり、変更は次の 4 層に写像される。

1. scope 定義: `.agents/amadeus/scopes/amadeus-pdm.md`（R001）
2. membership: stage frontmatter の `scopes:` 12 件 → compile で scope-grid.json / stage-graph.json へ転置（R002 / R003）
3. 参照面: SKILL.md scope 表（R004）、validator の scopeValues + ステージ scopes 配列（R005）、docs/amadeus/lifecycle/scopes.md（R006）
4. パリティ: engineFileExceptions 14 件（N3）

## 挿入位置と終点

pdm の workflow は intent-capture で始まり refined-mockups で終わる。統合点は approval-handoff の initiative-brief（Q4）。
