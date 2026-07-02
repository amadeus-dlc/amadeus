# U001 並行運用ポリシー契約

## ユニット

並行させる単位の判断基準、共有成果物の統合手順、ゲート承認の運用、同一 worktree での直列化、既存 Git Branching Policy との責務分担を、steering policy の契約として成立させる Unit である。

## 対象要求

- R001
- R002
- R003
- R004
- R005

## 価値境界

この Unit は、`steering/policies/parallel-operation.md` の判断基準（観察済みの実例に根拠がある範囲）、`policies.md` と `policies/README.md` の索引登録、`git-branching.md` との相互参照による責務分担の明記を扱う。

新しい phase や人間ゲートの追加、並行実行の他候補（Bolt の依存 wave 並行実行）、複数人チームでの並行と複数 workspace での組織利用、既存 Intent 20260701-git-branching-policy の lifecycle 再開は扱わない。

## 検証観点

- policy 本文から、並行可否、統合手順、承認運用、直列化の判断基準が読める。
- 各判断基準の根拠が、観察した実例（Intent 成果物、PR）への参照リンクで追跡できる。
- `policies.md` と `policies/README.md` の索引から policy へ到達できる。
- 責務分担が両 policy（parallel-operation.md と git-branching.md）から読め、既存本文と矛盾しない。
- workspace 全体が validator で pass を維持する。

## 未確認事項

- policy 本文の見出し構成（git-branching.md の目的、対象、責務分担の形式の踏襲）は Construction Functional Design で確定する。
- validator に個別 policy ファイルの構造検査を追加するかは Construction Functional Design で確定する。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `.amadeus/steering/policies/parallel-operation.md`（新設）、`.amadeus/steering/policies.md`、`.amadeus/steering/policies/README.md` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `.amadeus/steering/policies/git-branching.md`（責務分担の相互参照追記） | 未確認 | なし | 未確認 |

## 関連成果物

- [design.md](U001-parallel-operation-policy-contract/design.md)
