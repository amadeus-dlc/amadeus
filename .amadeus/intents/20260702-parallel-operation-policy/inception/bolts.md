# ボルト

## 一覧

| 識別子 | 概要 | ユニット | 設計 | 依存 | 詳細 |
|---|---|---|---|---|---|
| B001 | parallel-operation.md 本文を作成し、索引へ登録する。 | U001 | [design.md](units/U001-parallel-operation-policy-contract/design.md) | なし | [B001-policy-body-and-registration.md](bolts/B001-policy-body-and-registration.md) |
| B002 | git-branching.md へ責務分担の相互参照を追記し、整合を確認する。 | U001 | [design.md](units/U001-parallel-operation-policy-contract/design.md) | B001 | [B002-boundary-cross-reference.md](bolts/B002-boundary-cross-reference.md) |

## 依存関係

| ボルト | 依存 | 理由 |
|---|---|---|
| B001 | なし | policy 本文と索引が、相互参照の前提であるため。 |
| B002 | B001 | 相互参照が指す policy 本文の見出しが前提になるため。 |
