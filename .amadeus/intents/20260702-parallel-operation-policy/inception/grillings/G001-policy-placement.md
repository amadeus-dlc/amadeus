# G001: policy の配置先

## 概要

- 状態: completed
- 対象: Intent
- 反映先: [requirements.md](requirements.md)

## 確定判断

| ID | 判断 | 状態 | 反映先 | 置き換え先 |
|---|---|---|---|---|
| GD001 | 並行運用ポリシーは新規 `steering/policies/parallel-operation.md` に置き、`policies.md` と `policies/README.md` の索引から参照し、`git-branching.md` との相互参照で責務分担を明記する。 | active | [R005-registration-and-boundary.md](requirements/R005-registration-and-boundary.md) | なし |

## 質問記録

### Q001

- 確定判断: GD001
- 確認したいこと: 並行運用ポリシーの配置先を、新規 policy ファイルにするか、既存 `git-branching.md` への追記にするか。
- 確認が必要な理由: 配置先が Unit の実装対象と、既存 Git Branching Policy との責務分担の書き方を決めるため。
- 推奨回答: 新規 `policies/parallel-operation.md`。
- 推奨理由: SC-OUT-004 が既存 Intent 20260701-git-branching-policy の lifecycle 再開を除外済みであり、`git-branching.md` へ追記すると branch 戦略と並行運用という異なる関心が混ざり、既存 Intent の成果物境界が曖昧になるため。
- ユーザー回答: 新規 policy ファイルにする。
