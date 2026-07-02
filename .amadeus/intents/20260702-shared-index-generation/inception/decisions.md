# Inception 判断

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| D001 | Inception の所有境界を brownfield として固定する。 | accepted | なし | [D001-inception-boundary.md](decisions/D001-inception-boundary.md) |
| D002 | User Stories を省略する。 | accepted | D001 | [D002-skip-user-stories.md](decisions/D002-skip-user-stories.md) |
| D003 | Intent と Unit の 1:1 を粒度例外として認める。 | accepted | D001 | [D003-single-unit-exception.md](decisions/D003-single-unit-exception.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | なし | Inception の所有境界を固定するため。 |
| D002 | D001 | 所有境界が決まってから User Stories の要否を確定するため。 |
| D003 | D001 | 所有境界が決まってから成果物の粒度例外を判断するため。 |
