# RAID Log：Amadeus skill 英語化実施計画

## Risks

| ID | リスク | 影響 | 対応 |
|---|---|---|---|
| RISK001 | 英語化と意味変更が同じ PR に混ざる。 | Reviewer が差分の主旨を判断しにくくなる。 | PR 説明と計画成果物で翻訳変更と意味変更を分けて記録する。 |
| RISK002 | source skill と昇格先成果物がずれる。 | host environment で使う skill と変更対象の source skill が不整合になる。 | 昇格フローを使い、source skill と昇格先成果物を同一 PR で扱う。 |
| RISK003 | 子 Issue の完了証拠が追跡できなくなる。 | #399 の完了判断ができなくなる。 | PR merge または Issue close を完了証拠として Intent 成果物から参照する。 |

## Assumptions

| ID | 前提 | 確認方法 |
|---|---|---|
| ASM001 | GitHub Issue、Pull Request、CI、レビューボットの状態を参照できる。 | `gh` または GitHub 上の状態で確認する。 |
| ASM002 | #395、#400、#401、#402 は PR merge または Issue close で完了状態を確認できる。 | 各 Issue と対応 PR の状態を確認する。 |

## Issues

| ID | 課題 | 状態 |
|---|---|---|
| ISS001 | #401 配下の #391、#392、#393、#394 の扱いを #401 の完了証拠として追跡する必要がある。 | open |

## Dependencies

| ID | 依存 | 影響 |
|---|---|---|
| DEP001 | GitHub Issue | 子 Issue の状態と close を確認する。 |
| DEP002 | Pull Request | 対応 PR の merge を確認する。 |
| DEP003 | CI | PR merge 可能性の判断材料になる。 |
| DEP004 | レビューボット | コメント対応の完了判断に影響する。 |
