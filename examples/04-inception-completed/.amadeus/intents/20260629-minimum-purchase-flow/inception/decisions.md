# 判断

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| D001 | Inception の境界を固定する | 採用 | なし | [D001-inception-boundary.md](decisions/D001-inception-boundary.md) |
| D002 | Unit 分割を固定する | 採用 | D001 | [D002-unit-split.md](decisions/D002-unit-split.md) |
| D003 | Bolt 分割を固定する | 採用 | D002 | [D003-bolt-split.md](decisions/D003-bolt-split.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | なし | Intent の中心サブドメインと境界づけられたコンテキストを固定する判断であるため。 |
| D002 | D001 | Unit は BC001 販売管理の境界を前提に分割するため。 |
| D003 | D002 | Bolt は Unit Design Brief の分割方針に従うため。 |
