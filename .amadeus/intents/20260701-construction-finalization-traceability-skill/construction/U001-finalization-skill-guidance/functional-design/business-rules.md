# Business Rules

## 目的

Construction finalization が満たすべき追跡表の規則を定義する。

## 業務ルール

| 識別子 | 規則 | 根拠 | 状態 |
|---|---|---|---|
| BR001 | 完了済み Construction は `Construction からの追跡` を持つ。 | R001 | accepted |
| BR002 | `Construction からの追跡` は `ボルト`、`タスク`、`証拠`、`状態` の列を持つ。 | R002 | accepted |
| BR003 | `Task Generation からの追跡` だけでは完了済み Construction の traceability 条件を満たさない。 | R003 | accepted |

## 例外

Construction が Task Generation 段階に留まる場合は、`Construction からの追跡` の完了証拠を確定しない。

## Intent Contracts

| 識別子 | 種別 | 条件 | 根拠 | 状態 |
|---|---|---|---|---|
| PRE001 | 事前条件 | Inception gate が passed である。 | state.json | accepted |
| POST001 | 事後条件 | skill から完了時表要件、必須列、Task Generation 表との違いを判断できる。 | R001, R002, R003 | accepted |
| INV001 | 不変条件 | validator の成果物契約はこの Bolt では変更しない。 | Unit Design Brief | accepted |

## 未確認事項

なし。
