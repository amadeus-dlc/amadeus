# Traceability：Ideation

## 成功条件と成果物の対応

| 成功条件 | 対応する成果物 | 状態 |
|---|---|---|
| パリティ検査が機械化され green（基準 commit fde1e1af、名前写像、除外リスト） | [intent-statement.md](intent-capture/intent-statement.md) の成功条件、[scope-document.md](scope-definition/scope-document.md) の対象、[constraint-register.md](feasibility/constraint-register.md) の C003、[G001](grillings/G001-v2-parity-strategy.md) の GD007 | 定義済み（実装は Construction） |
| `npm run test:all` が green | [constraint-register.md](feasibility/constraint-register.md) の C002、[scope-document.md](scope-definition/scope-document.md) の順序の方針 | 定義済み（検証は各 Bolt PR と CI） |
| この Intent 自身が新エンジン駆動で 1 周完走 | [intent-statement.md](intent-capture/intent-statement.md) の成功条件、[G002](grillings/G002-scope-boundary.md) の GD010（エンジン縦切り）、[raid-log.md](feasibility/raid-log.md) の walking skeleton 検証 | 定義済み（実装は Construction） |
