# Inception Decisions

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| D001 | Inception の対象境界を Skill Contract catalog、生成物、参照入口に固定する。 | accepted | なし | [D001-inception-boundary.md](decisions/D001-inception-boundary.md) |
| D002 | Unit のコンテキストは `BC001 自己開発運用` を参照する。 | accepted | D001 | [D002-bc001-self-development-governance.md](decisions/D002-bc001-self-development-governance.md) |
| D003 | `references/skill-contract.md` は手書きではなく catalog からの生成物として扱う。 | accepted | D001 | [D003-generated-reference-contracts.md](decisions/D003-generated-reference-contracts.md) |
| D004 | Unit と Bolt を catalog、生成とずれ検出、consumer 参照入口の3境界に分ける。 | accepted | D001, D002, D003 | [D004-unit-bolt-granularity.md](decisions/D004-unit-bolt-granularity.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | なし | Inception 全体の対象範囲を固定する判断であるため。 |
| D002 | D001 | 対象境界を自己開発運用に位置付ける判断であるため。 |
| D003 | D001 | 生成物方針は対象境界に含まれる契約管理の判断であるため。 |
| D004 | D001, D002, D003 | Unit/Bolt 粒度は境界、コンテキスト、生成物方針を前提に決めるため。 |
