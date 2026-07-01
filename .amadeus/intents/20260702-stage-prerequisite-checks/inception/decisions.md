# 判断

## 一覧

| 識別子 | タイトル | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|---|
| D001 | Inception の所有境界 | 要求、ユースケース、Unit、Bolt までに限定する。 | accepted | なし | [D001-inception-boundary.md](decisions/D001-inception-boundary.md) |
| D002 | BC001 自己開発運用 | Unit の Bounded Context として BC001 自己開発運用を参照する。 | accepted | D001 | [D002-bc001-self-development-governance.md](decisions/D002-bc001-self-development-governance.md) |
| D003 | User Stories 省略 | User Stories は作らず、ユースケースの Story 参照を `なし` にする。 | accepted | D001 | [D003-user-stories-not-required.md](decisions/D003-user-stories-not-required.md) |
| D004 | Unit と Bolt の粒度 | Unit は 2 件、Bolt は 3 件に分ける。 | accepted | D001, D002, D003 | [D004-unit-bolt-granularity.md](decisions/D004-unit-bolt-granularity.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | なし | Inception の所有境界がすべての判断の前提であるため。 |
| D002 | D001 | Unit の Bounded Context は Inception の対象範囲内で参照するため。 |
| D003 | D001 | User Stories の要否は Inception の成果物境界に関わるため。 |
| D004 | D001, D002, D003 | Unit と Bolt の粒度は、所有境界、コンテキスト、Story 省略判断を前提にするため。 |

## Inception Gate

| 観点 | 状態 | 根拠 |
|---|---|---|
| 要求追跡 | passed | R001 から R005 までを use case、unit、bolt に対応付けた。 |
| 対象境界追跡 | passed | SC-IN-001 から SC-IN-007 までを要求と bolt に対応付けた。 |
| ドメイン参照 | passed | Unit の context は Domain Map の adopted Bounded Context である BC001 を参照する。 |
| 依存関係 | passed | Unit と Bolt の依存を明示し、Context Map に未登録依存がないことを確認した。 |

## 未確認事項

- Construction で追加する eval の配置は Functional Design で確定する。
