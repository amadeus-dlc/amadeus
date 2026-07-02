# Domain Entities

## 目的

phase gate の skill 契約で扱う概念を、実装とレビューで同じ名前で参照できるようにする。

Functional Design は詳細な Domain Model と Intent Contracts の管理元である。

## Domain Entity

| 識別子 | 名前 | 責務 | 関連 |
|---|---|---|---|
| DE001 | Task Generation Gate | Bolt の Task 生成に対する人間承認の関門を表す。`ready_for_approval` と `passed` の状態を持つ。 | BR001, BR002 |
| DE002 | Approval Evidence | 人間承認の証拠を表す。`kind: approval` と対象成果物への `path` を持つ。 | BR002, INV001 |
| DE003 | Deterministic Grilling Trigger | 前段成果物の未確定事項の文言規約による `grill_required` の判定規則を表す。 | BR003, BR004 |
| DE004 | Deferred Decision Notation | 後続 phase へ送る未確定事項の記録規約「〜は <phase> で判断する。」を表す。 | BR003, BR005 |
| DE005 | Recorded Decision Reference | scaffold-only を許可する確定判断の記録への参照を表す。GitHub Issue の確定判断、Grilling Decision Trail、Discovery Brief の確定済み判定と候補判断の 3 種がある。 | BR006 |

## 関係

- DE001 Task Generation Gate は、`passed` への遷移時に DE002 Approval Evidence を必ず伴う。
- DE003 Deterministic Grilling Trigger は、DE004 Deferred Decision Notation で書かれた項目だけを判定対象にする。
- DE005 Recorded Decision Reference は、ideation の auto 判定が scaffold-only を選ぶための前提になる。

## Domain Map と Context Map への反映候補

| 対象 | 種別 | 候補内容 | 承認後の扱い | 根拠 |
|---|---|---|---|---|
| なし | Domain Map | 反映候補なし。BC001 自己開発運用の既存境界内の契約変更である。 | 反映しない | [D002](../../../inception/decisions/D002-bc001-reference.md) |

## 未確認事項

なし。
