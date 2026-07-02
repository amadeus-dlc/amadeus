# G001: status: waiting_approval の検出範囲

## 概要

- 状態: completed
- 対象: Intent
- 反映先: [business-rules.md](U001-approval-queue-listing-contract/functional-design/business-rules.md)

## 確定判断

| ID | 判断 | 状態 | 反映先 | 置き換え先 |
|---|---|---|---|---|
| GD001 | 承認待ちの判定条件に、phase gate の `waiting_approval` と `taskGeneration.status` の `ready_for_approval` に加えて、top-level と phase ブロックの `status: waiting_approval`（gate 以外の待ち表現）も含める。 | active | [business-rules.md](U001-approval-queue-listing-contract/functional-design/business-rules.md) | なし |

## 質問記録

### Q001

- 確定判断: GD001
- 確認したいこと: 承認待ち判定に phase や stage の `status: waiting_approval`（gate 以外の待ち表現）を含めるか。
- 確認が必要な理由: R001 の未確認事項として Inception から引き継がれており、承認待ち判定の検出範囲（見落とし防止の範囲）を決めるため。
- 推奨回答: 含める。
- 推奨理由: この Intent の目的は承認の見落としをなくすことであり、契約語彙に定義済みの待ち表現（`statusValues` の `waiting_approval`）を検出しないと見落としが残る。どのフィールドが根拠かは待ち理由列で区別できる。
- ユーザー回答: 含める。
