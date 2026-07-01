# R005 consumer 参照入口

## 概要

validator、evaluator、decision review、learning review が Skill Contract を入力として参照できる入口を持つ。

## 背景

Issue #257 の decision review と Issue #259 の learning review は、`SKILL.md` の自然文を推測して判断するのではなく、Skill Contract を検証の入力にする必要がある。

## 要求

| 項目 | 内容 |
|---|---|
| validator | Skill Contract の生成 TypeScript を参照できる入口を持つ。 |
| evaluator | Skill Contract を品質評価の入力候補として扱える。 |
| decision review | 対象判断に必要な契約条件を Skill Contract から参照できる。 |
| learning review | feedback 条件と学習候補を Skill Contract から参照できる。 |

## 受け入れ

- validator または evaluator が参照する Skill Contract 入口が存在する。
- #257 と #259 の review が参照可能な生成物と契約項目を持つ。
- validator の `passed` は内容承認ではなく、構造検出として扱う境界が維持されている。

## 依存

- R003。
- R004。

## 未確認事項

- なし。
