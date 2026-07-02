# G001: Intent Record の単位

## 概要

- 状態: completed
- 対象: Intent
- 反映先: [scope.md](scope.md)

## 確定判断

| ID | 判断 | 状態 | 反映先 | 置き換え先 |
|---|---|---|---|---|
| GD001 | Issue #351 の並行運用ポリシーを新規 Intent 20260702-parallel-operation-policy として扱い、既存 Intent 20260701-git-branching-policy の lifecycle 再開による更新にしない。policy 成果物の配置先（`git-branching.md` への追記か新規 policy ファイルか）は Inception で判断する。 | active | [scope.md](scope.md) | なし |

## 質問記録

### Q001

- 確定判断: GD001
- 確認したいこと: Issue #351 を新規 Intent として扱うか、既存 Intent 20260701-git-branching-policy の更新として扱うか。
- 確認が必要な理由: この判断で Intent Record の作成先と Ideation 成果物の配置が決まる。Discovery 20260702-parallel-execution が「Ideation 前の判断点」として候補判断に残した項目である。
- 推奨回答: 新規 Intent として作成する。
- 推奨理由: 既存 Intent は construction 完了かつ全ゲート passed であり、lifecycle の再開は完了状態の追跡を壊す。Issue #351 の対象（フェーズパイプライン、ゲート承認のバッチ化）は git branching の範囲を超える。policy 成果物を `git-branching.md` への追記にするか新規ファイルにするかは、新規 Intent の中でも後段で判断できる。
- ユーザー回答: 新規 Intent として作成する。
