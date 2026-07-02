# U001 phase PR 統合契約

## ユニット

小さい Intent の phase PR を統合してよい条件、統合単位、記録項目を steering policy の契約として成立させる Unit である。

## 対象要求

- R001
- R002
- R003
- R004

## 価値境界

この Unit は、統合を許可する 3 条件と既定の明文化、統合単位（仕様側 2 グループ）と branch 命名、統合 PR の記録項目、既存文書（development.md、粒度制約）との整合を扱う。

Construction 実装と finalization の統合、phase gate の廃止や自動化、大きい Intent への適用は扱わない。

## 検証観点

- Git Branching Policy から統合条件 3 件と既定が読める。
- 統合単位と branch 命名の例が既存の命名と並んで読める。
- 統合 PR の記録項目が定義され、gate 判定の phase ごとの独立が読める。
- development.md と粒度制約が統合条件と矛盾なく読める。
- 対象 Intent が validator で pass する。

## 未確認事項

- 統合条件の最終文言と節の配置は Construction で確定する。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `.amadeus/steering/policies/git-branching.md` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `.amadeus/development.md` | 未確認 | なし | 未確認 |

## 関連成果物

- [design.md](U001-pr-consolidation-contract/design.md)
