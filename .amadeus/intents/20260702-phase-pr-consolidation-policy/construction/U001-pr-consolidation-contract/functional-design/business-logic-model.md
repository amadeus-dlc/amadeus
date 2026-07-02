# Business Logic Model

## 目的

小さい Intent の phase PR 統合を、条件判定、統合 PR の作成と記録、phase ごとの gate 判定として運用できるようにする。

## 対象 Unit

U001 phase PR 統合契約。

## 業務ロジック

| 識別子 | ロジック | 入力 | 出力 | 根拠 |
|---|---|---|---|---|
| BL001 | Agent が対象 Intent の実行スコープ、変更対象、未確定事項の解消状況を読み、統合条件 3 件をすべて満たすかを判定する。 | ideation/scope.md、ideation/ideation.md、変更対象の種別 | 統合可否の判定 | R001, UC001 |
| BL002 | 統合が許可された場合、仕様側（Discovery〜Inception）の成果物を `codex/issue-<n>-specification` の branch にまとめて PR 化する。 | 統合可否の判定、仕様側 phase 成果物 | 統合 PR | R002, UC002 |
| BL003 | 統合 PR の説明に、含まれる phase 成果物の一覧と各 phase の gate 状態を記録する。 | 各 phase の state.json | PR 説明の記録項目 | R003, UC002 |
| BL004 | gate の判定は phase ごとに state.json で行い、PR の統合は gate の統合を意味しない。 | 各 phase の state.json | phase ごとの gate 判定 | R003, UC003 |
| BL005 | 条件を満たさない場合は、既定（phase ごとの PR）に従う。 | 統合可否の判定 | 既定の PR 運用 | R001, UC001 |

## 入力

| 入力 | 説明 | 根拠 |
|---|---|---|
| 実行スコープ | `ideation/scope.md` の実行制御に記録された値。 | R001 |
| 変更対象の種別 | 文書だけか、実装コードとテストコードを含むか。 | R001 |
| 未確定事項の解消状況 | 事前の grilling または Issue の確定判断で解消済みか。 | R001 |
| 各 phase の state.json | gate 状態の記録元。 | R003 |

## 出力

| 出力 | 説明 | 利用先 |
|---|---|---|
| 統合可否の判定 | 3 条件の判定結果と、選ばれた PR 運用（統合または既定）。 | Agent の branch 作成 |
| 統合 PR の記録項目 | 含まれる phase 成果物の一覧と各 phase の gate 状態。 | Reviewer のレビュー判断、Maintainer の merge 判断 |

## 未確認事項

なし。
