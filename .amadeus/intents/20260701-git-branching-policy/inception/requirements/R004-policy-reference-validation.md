# R004: policy 参照と検出境界

## 要求

- Intent の traceability、acceptance、PR 説明から参照する Git ブランチ戦略 policy を定義する。
- branch 戦略違反のうち、validator または evaluator で検出する候補と、人間判断だけで扱う候補を分ける。

## 受け入れ条件

- Intent 成果物が Git ブランチ戦略 policy をどこから参照するかを読める。
- acceptance と PR 説明で、branch と policy の対応をどの粒度で示すかを読める。
- validator または evaluator で検出できる候補を読める。
- merge 可否、例外の妥当性、人間承認が必要な判断を機械検査と混同しないことを読める。

## 根拠

- [Issue #254](https://github.com/amadeus-dlc/amadeus/issues/254)
- [scope.md](../ideation/scope.md)
- [codebase-analysis.md](../codebase-analysis.md)

## 未確認事項

- validator と evaluator のどちらに検出候補を置くかは Construction で確定する。
