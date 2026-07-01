# Business Logic Model

## 目的

U002 は、Git ブランチ戦略 policy を Intent 成果物と PR 説明から参照する方針と、validator または evaluator で検出する境界を扱う。

この Functional Design では、policy 文書で機械検査候補と人間判断対象を分けて記録する。

## 対象 Unit

- U002 policy 参照と検出境界

## 業務ロジック

1. 対象 Intent の Construction traceability には、Git ブランチ戦略 policy の参照を証拠として残す。
2. PR 説明には、対象 Issue、対象 Intent、検証結果、必要に応じて Git ブランチ戦略 policy への参照を残す。
3. validator で検出する候補は、必須 path、必須リンク、state と成果物の構造整合に限定する。
4. evaluator で検出する候補は、policy 参照の説明不足や branch lifecycle の論理不整合に限定する。
5. merge 可否、例外の妥当性、人間承認は、人間判断として扱う。

## 入力

- Git ブランチ戦略 policy path
- 対象 Intent
- Construction traceability
- acceptance
- PR 説明
- CI 結果
- review comment

## 出力

- policy 参照方針
- validator 検出候補
- evaluator 検出候補
- 人間判断対象
- 現在 Intent と後続 Issue 候補の分離基準

## 未確認事項

- なし。
