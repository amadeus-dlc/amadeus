# ユニット

## 一覧

| 識別子 | 概要 | 要求 | コンテキスト | 依存 | 詳細 |
|---|---|---|---|---|---|
| U001 | Git ブランチ戦略 policy の配置と branch lifecycle を扱う。 | R001, R002, R003 | BC001 | なし | [U001-git-branching-policy.md](units/U001-git-branching-policy.md) |
| U002 | Git ブランチ戦略 policy の参照方法と検出境界を扱う。 | R004 | BC001 | U001 | [U002-policy-traceability-validation.md](units/U002-policy-traceability-validation.md) |

Unit の `コンテキスト` は Domain Map の `adopted` Bounded Context を参照する。

## 依存関係

| ユニット | 依存 | 理由 |
|---|---|---|
| U001 | なし | Git ブランチ戦略 policy の配置と branch lifecycle が参照と検出境界の前提であるため。 |
| U002 | U001 | policy 参照と検出境界は、配置済み policy と branch lifecycle ルールを前提にするため。 |
