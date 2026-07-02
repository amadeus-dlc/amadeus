# B001 policy 本文と索引登録

## 概要

`steering/policies/parallel-operation.md` を新設し、並行可否、統合手順、承認運用、直列化の判断基準を観察済みの実例への根拠リンク付きで記録する。
`policies.md` と `policies/README.md` の索引へ登録する。

## 対象ユニット

- U001

## 設計

- [design.md](../units/U001-parallel-operation-policy-contract/design.md)

## 完了条件

- `parallel-operation.md` から、並行させる単位の判断基準（接触面による並行可否）、共有成果物の統合手順、ゲート承認の運用（キュー確認、バッチ承認、遡及承認）、同一 worktree での直列化が読める。
- 各判断基準に、観察した実例（Intent 成果物、PR）への参照リンクがある。
- `policies.md` と `policies/README.md` の索引から policy へ到達できる。
- workspace 全体が validator で pass を維持する。

## 依存

なし。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `.amadeus/steering/policies/parallel-operation.md`（新設）、`.amadeus/steering/policies.md`、`.amadeus/steering/policies/README.md` | 未確認 | なし | 未確認 |

## 未確認事項

- policy 本文の見出し構成と各判断基準の文言は Construction Functional Design で確定する。
- validator への個別 policy 構造検査追加の要否は Construction Functional Design で確定する。
