# UC004 policy を参照する

## ユースケース

Agent が steering の索引から並行運用ポリシーを見つけ、Git Branching Policy との責務分担に従って参照先を選ぶ。

## アクター

- ACT002 Agent

## 外部システム

- なし

## 事前条件

- steering layer の `policies.md` と `policies/README.md` が存在する。

## 基本フロー

1. Agent は `policies.md` または `policies/README.md` の索引から並行運用ポリシーを見つける。
2. 参照したい判断が単一 branch の lifecycle（branch 名、追従、PR 運用）なら Git Branching Policy を、複数 worktree の並行判断（並行可否、統合手順、承認運用、直列化）なら並行運用ポリシーを選ぶ。
3. 選んだ policy の判断基準を根拠に作業を進め、Intent 成果物や PR 説明から policy を参照する。

## 代替フロー

| 条件 | 扱い |
|---|---|
| 参照したい判断が両 policy にまたがる。 | 両方を参照し、責務分担の記述に従ってそれぞれの範囲の判断基準を使う。 |

## 対応要求

- R005

## 未確認事項

- なし。
