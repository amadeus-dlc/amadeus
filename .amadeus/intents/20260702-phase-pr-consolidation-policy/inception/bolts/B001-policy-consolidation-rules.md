# B001 policy への統合規則の追記

## 概要

Git Branching Policy へ、phase PR の統合条件（3 条件必須）、既定（phase ごとの PR）、統合単位（仕様側 2 グループ）、branch 命名（`codex/issue-<n>-specification`）、統合 PR の記録項目を追記する Bolt である。

## 対象ユニット

- U001

## 設計

- [U001 Unit Design Brief](../units/U001-pr-consolidation-contract/design.md)

## 完了条件

- 統合を許可する 3 条件と、許可しない場合の既定が policy から読める。
- 統合単位（Discovery〜Inception と Construction 以降の 2 グループ、finalization は別 PR）と branch 命名の例が読める。
- 統合 PR の説明に含める記録項目（含まれる phase 成果物の一覧、各 phase の gate 状態）が定義されている。
- gate の判定は phase ごとに `state.json` で行い、PR の統合が gate の統合を意味しないことが読める。
- 統合対象は仕様成果物であり、skill 変更を含む PR は粒度制約に従うことが読める。

## 依存

- なし。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `.amadeus/steering/policies/git-branching.md` | 未確認 | なし | 未確認 |

## 未確認事項

- 統合条件の最終文言と節の配置は Task Generation と実装で確定する。
