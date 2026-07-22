# Team Practices — 260720-leader-store-sync(部分ドラフト)

上流入力(consumes 全数): business-overview, architecture, code-structure, technology-stack, dependencies, code-quality-assessment — c1 代用の内実はこの codekb 6点(architecture.md の「leader 所有物の機械的同定と main 同期運搬」節、code-structure.md の scripts/・tests/ 配置、technology-stack.md の Bun/gh 前提、dependencies.md の外部依存最小性、code-quality-assessment.md の検証ゲート水準、business-overview.md のワークスペース境界)

## 温存宣言(practices-discovery:c2)

全セクション live 温存の部分ドラフト — 変更セクション 0 のため practices-promote は実行しない(churn 回避)。正本は `amadeus/spaces/default/memory/{org,team,project}.md` の現行 live 層。

## 本 intent が依拠する live プラクティス(参照)

- Way of Working: norm-pr-from-main-base+E-PM10A 追補(sync PR の生成規則の正本)
- Code Style: functional-domain-modeling-ts+mirror.ts 既習 idiom
- Testing: 2層様式(fs-tests-integration-first)
