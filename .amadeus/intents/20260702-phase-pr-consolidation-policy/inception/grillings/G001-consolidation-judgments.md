# G001: 統合単位、統合条件、記載先

## 概要

- 状態: completed
- 対象: Intent
- 反映先: [requirements.md](requirements.md)

## 確定判断

| ID | 判断 | 状態 | 反映先 | 置き換え先 |
|---|---|---|---|---|
| GD001 | 統合単位は Discovery〜Inception（仕様側）と Construction 以降の 2 グループとする。finalization は従来どおり別 PR。仕様側統合 branch の命名は `codex/issue-<n>-specification` とする。 | active | [requirements/R002-consolidation-boundary-and-naming.md](requirements/R002-consolidation-boundary-and-naming.md) | なし |
| GD002 | 統合を許可する条件は、実行スコープが `refactor` または docs 系、変更対象が文書だけ、Ideation の未確定事項が事前の grilling または Issue の確定判断で解消済み、の 3 条件すべて必須とする。 | active | [requirements/R001-consolidation-conditions.md](requirements/R001-consolidation-conditions.md) | なし |
| GD003 | 記載先は Git Branching Policy（`.amadeus/steering/policies/git-branching.md`）への追記とする。 | active | [requirements/R004-existing-documents-consistency.md](requirements/R004-existing-documents-consistency.md) | なし |

## 質問記録

### Q001

- 確定判断: GD001
- 確認したいこと: phase PR をどこまで 1 PR に統合できる境界にするか。
- 確認が必要な理由: 要求の中核であり、Requirement と policy の記述範囲が決まるため。Ideation の未確定事項に「Inception で判断する」と記録されていた。
- 推奨回答: Discovery〜Inception（仕様側）と Construction 以降の 2 グループとする。
- 推奨理由: 仕様側と実行側の間には Task Generation Gate の人間承認があり、ここで PR を分けると gate と PR 単位が自然に対応する。finalization は merge イベントを挟むため Issue の対象外と整合する。直近の実績では 5 PR が 3 PR になる。
- ユーザー回答: 推奨回答どおり採用する。

### Q002

- 確定判断: GD002
- 確認したいこと: 統合を許可する条件の最終形（Issue の条件候補 3 件を必須にするか、一部を推奨に緩めるか）。
- 確認が必要な理由: policy の判定基準の強度が決まり、要求の受け入れ条件に直結するため。Ideation の未確定事項に「Inception で判断する」と記録されていた。
- 推奨回答: 3 条件すべて必須とする。
- 推奨理由: scaffold-only の許可条件（確定判断の記録の実在）と同じ型で判定でき、迂回路を作らない。未確定のまま仕様 3 phase を 1 PR にまとめると grilling なしの大きな差し戻しが発生するリスクがある。
- ユーザー回答: 推奨回答どおり採用する。

### Q003

- 確定判断: GD003
- 確認したいこと: policy の記載先を Git Branching Policy への追記にするか、新しい policy 文書の新設にするか。
- 確認が必要な理由: Unit の実装対象と Bolt の変更ファイルが決まるため。Ideation の未確定事項に「Inception で判断する」と記録されていた。
- 推奨回答: Git Branching Policy へ追記する。
- 推奨理由: 統合条件は branch 作成、PR 作成、merge 後処理と一体の Branch Lifecycle の判断基準であり、branch 命名との整合も同じ文書内で完結する。policy 文書が増えず、参照先が分散しない。
- ユーザー回答: 推奨回答どおり採用する。
