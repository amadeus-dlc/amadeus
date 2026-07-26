上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Reliability Requirements — kimi-harness-docs

> 上流入力の使用箇所: business-rules.md の BR-1/BR-2/BR-5、business-logic-model.md の検証シーケンス、requirements.md の FR-8a を根拠とする。

## 対象の概要

ドキュメントの信頼性は「記載どおりに再現できる」こと。

## 信頼性の仕組み

- **実測に基づく記述**: dogfood・live journey の結果と突合し、未検証の動作を書かない(business-rules.md BR-5、team.md P2)
- **検証**: リンク切れなし・言語規則(docs は英語/ja 対訳)・手順の再現性(business-logic-model.md §検証シーケンス)
- **陳腐化の防止**: snippet は参照とし、バージョン値は doctor フロアと同じ値を1箇所で書く(business-rules.md BR-1/BR-2)
