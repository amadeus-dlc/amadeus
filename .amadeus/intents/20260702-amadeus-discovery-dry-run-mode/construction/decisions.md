# Construction 判断

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| D001 | Functional Design は UI なしの Discovery 契約として扱う。 | accepted | なし | [D001-functional-design-scope.md](decisions/D001-functional-design-scope.md) |
| D002 | `dry-run` は読み取り専用 mode として `scaffold-only` から分ける。 | accepted | D001 | [D002-dry-run-mode-boundary.md](decisions/D002-dry-run-mode-boundary.md) |
| D003 | 同期検証は promote-skill と text contract で扱う。 | accepted | D002 | [D003-sync-verification-boundary.md](decisions/D003-sync-verification-boundary.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | なし | Construction の Functional Design 範囲を先に固定するため。 |
| D002 | D001 | `dry-run` の mode 境界は Functional Design の範囲に依存するため。 |
| D003 | D002 | 同期検証は `dry-run` の source skill 契約が確定してから扱うため。 |
