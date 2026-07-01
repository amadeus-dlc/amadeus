# Construction 判断

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| D001 | Functional Design の対象 Unit と Domain Map 反映範囲を固定する。 | active | なし | [D001-functional-design-scope.md](decisions/D001-functional-design-scope.md) |
| D002 | Git ブランチ戦略 policy の配置を固定する。 | active | D001 | [D002-policy-placement.md](decisions/D002-policy-placement.md) |
| D003 | branch lifecycle の運用ルールを固定する。 | active | D002 | [D003-branch-lifecycle-rules.md](decisions/D003-branch-lifecycle-rules.md) |
| D004 | policy 参照と検出境界を policy 文書で扱う。 | active | D002, D003 | [D004-policy-reference-validation.md](decisions/D004-policy-reference-validation.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | なし | Construction の Functional Design 対象を先に固定する必要があるため。 |
| D002 | D001 | policy 配置は U001 の Functional Design を根拠にするため。 |
| D003 | D002 | branch lifecycle は配置済みの個別 policy へ記録するため。 |
| D004 | D002, D003 | 参照と検出境界は、policy 配置と branch lifecycle を前提にするため。 |
