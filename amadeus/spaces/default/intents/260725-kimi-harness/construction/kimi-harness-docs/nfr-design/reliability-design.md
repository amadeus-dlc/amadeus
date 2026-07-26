上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Reliability Design — kimi-harness-docs

> 上流入力の使用箇所: reliability-requirements.md の3機構(実測のみ・検証・単一ソース)を設計の対象とする。

## 対象の概要

reliability-requirements.md のとおり、docs の信頼性は再現可能性。

## 設計

- **実測の転記**: dogfood と live journey の結果と突合してから書く。未検証の動作は書かない(reliability-requirements.md §信頼性の仕組み)
- **検証**: リンク実在・言語規則(docs は英語/ja 対訳)・手順の再現性をチェックとする(reliability-requirements.md §信頼性の仕組み)
- **単一ソース**: バージョン値はフロアと同じ値を1箇所、配線内容は snippet 参照(reliability-requirements.md §信頼性の仕組み)
