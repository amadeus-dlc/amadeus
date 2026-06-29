# 判断

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| D001 | Inception の境界を固定する | 採用 | なし | [D001-inception-boundary.md](decisions/D001-inception-boundary.md) |
| D002 | Unit と Bolt の分割を固定する | 採用 | D001 | [D002-unit-and-bolt-boundary.md](decisions/D002-unit-and-bolt-boundary.md) |
| D003 | 対象外範囲と依存範囲を固定する | 採用 | D001 | [D003-out-of-scope-and-dependencies.md](decisions/D003-out-of-scope-and-dependencies.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | なし | Inception 成果物全体の境界判断であるため。 |
| D002 | D001 | Unit と Bolt の分割は、Inception の境界を前提にするため。 |
| D003 | D001 | 対象外範囲と依存範囲は、Inception の境界を前提にするため。 |
