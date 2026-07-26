上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Security Requirements — kimi-harness-docs

> 上流入力の使用箇所: business-rules.md の BR-1/BR-2/BR-5(実測に基づく記述)を根拠とする。

## 対象の概要

ドキュメントのセキュリティは「正確でない手順を広めない」ことに集約される。

## 脅威モデルと基準

- **秘密情報を書かない**: 手順にはパスとコマンドのみを書き、credential の取得・保存方法には踏み込まない(設計意図としての不変条件。credential は Kimi 側の store が管理するため、docs に書く内容が存在しない)
- **正確な前提**: バージョンフロアは実測版を明記し、未検証の環境で動くかのような記述をしない(business-rules.md BR-1)
- **snippet は参照**: hook 配線内容は snippet 正本を参照とし、docs への転記で陳腐化したコマンドを残さない(business-rules.md BR-2)
