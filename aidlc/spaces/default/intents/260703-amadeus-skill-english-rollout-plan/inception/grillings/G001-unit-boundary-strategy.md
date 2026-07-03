# G001：Unit 境界戦略と粒度

## 概要

- 状態: completed
- 対象: Intent `260703-amadeus-skill-english-rollout-plan` の Units Generation
- 反映先: [units-generation-questions.md](units-generation/units-generation-questions.md)、[unit-of-work.md](units-generation/unit-of-work.md)

Issue #399 の子 Issue 完了追跡を Unit へ分割するため、Unit 境界戦略と粒度を確認した。

## 確定判断

| ID | 判断 | 状態 | 反映先 | 置き換え先 |
|---|---|---|---|---|
| GD001 | Unit 境界は、子 Issue 単位を基本にした機能別、中粒度とする。 | active | [units-generation-questions.md](units-generation/units-generation-questions.md) の Q001 | なし |
| GD002 | #401 配下の #391、#392、#393、#394 は、#401 Unit に内包する。 | active | [unit-of-work.md](units-generation/unit-of-work.md) の U003 | なし |
| GD003 | #399 の完了判断は、U004 の到達条件として扱う。 | active | [unit-of-work.md](units-generation/unit-of-work.md) の U004 | なし |

## 質問記録

### Q001

- 確認したいこと: Unit の境界戦略と粒度をどうするか。
- 確認が必要な理由: Units Generation は Unit の境界と依存 DAG だけを定義するため、境界戦略と粒度を先に固定する必要がある。
- 推奨回答: 機能別で中粒度。#395、#400、#401、#402 の子 Issue 単位を基本にし、#401 配下 Issue の扱いは #401 Unit に内包する。
- 推奨理由: GitHub Issue の完了証拠と Unit 境界が一致し、#401 配下 Issue を親 Intent の直接完了条件へ広げずに追跡できる。
- ユーザー回答: 1
- 確定判断: GD001、GD002、GD003
