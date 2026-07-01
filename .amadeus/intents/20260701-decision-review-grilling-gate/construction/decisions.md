# Construction Decisions

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| D001 | Functional Design は decision review gate と phase skill 採用規則に限定する。 | accepted | なし | [D001-functional-design-scope.md](decisions/D001-functional-design-scope.md) |
| D002 | decision review は質問実行をせず、`amadeus-grilling` への handoff を選ぶ。 | accepted | D001 | [D002-decision-review-handoff-boundary.md](decisions/D002-decision-review-handoff-boundary.md) |
| D003 | 初期対象 phase skill は Ideation、Inception、Construction に限定する。 | accepted | D001, D002 | [D003-phase-skill-adoption-scope.md](decisions/D003-phase-skill-adoption-scope.md) |
| D004 | validator、evaluator、Skill Contract は内容承認ではなく入力証拠または確認候補として扱う。 | accepted | D001, D002, D003 | [D004-verification-contract-boundary.md](decisions/D004-verification-contract-boundary.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | なし | Construction の設計境界を先に決めるため。 |
| D002 | D001 | decision review の責務を Functional Design の対象境界内で固定するため。 |
| D003 | D001, D002 | phase skill への採用範囲は decision review の責務境界を前提にするため。 |
| D004 | D001, D002, D003 | 検証と契約の境界は decision review と phase skill 採用範囲の両方に影響するため。 |
