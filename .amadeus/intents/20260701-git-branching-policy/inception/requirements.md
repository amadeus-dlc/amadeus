# 要求

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| R001 | Git ブランチ戦略を steering policy として採用し、概要と個別 policy の配置を説明できる。 | 採用済み | なし | [R001-policy-placement.md](requirements/R001-policy-placement.md) |
| R002 | Issue 起点の branch 作成、`origin/main` 追従、PR 作成前検証、merge 後処理の判断基準を定義できる。 | 採用済み | R001 | [R002-branch-lifecycle.md](requirements/R002-branch-lifecycle.md) |
| R003 | AGENTS.md の操作指示と steering policy の責務分担を説明できる。 | 採用済み | R001 | [R003-agents-policy-responsibility.md](requirements/R003-agents-policy-responsibility.md) |
| R004 | Intent の traceability、acceptance、PR 説明から参照する policy と、validator または evaluator で検出する候補を分けられる。 | 採用済み | R001, R002, R003 | [R004-policy-reference-validation.md](requirements/R004-policy-reference-validation.md) |

## 依存関係

| 要求 | 依存 | 理由 |
|---|---|---|
| R001 | なし | policy として採用する判断と配置が、他の要求の前提であるため。 |
| R002 | R001 | branch lifecycle ルールは、配置された policy の具体内容として定義するため。 |
| R003 | R001 | AGENTS.md との責務分担は、steering policy の役割を前提にするため。 |
| R004 | R001, R002, R003 | 参照と検出境界は、policy 配置、branch lifecycle、操作指示との責務分担を前提にするため。 |

## 受け入れ状態

| 要求 | 状態 | 証拠 |
|---|---|---|
| R001 | 採用済み | 未登録 |
| R002 | 採用済み | 未登録 |
| R003 | 採用済み | 未登録 |
| R004 | 採用済み | 未登録 |
