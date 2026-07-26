上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Security Design — kimi-harness-docs

> 上流入力の使用箇所: security-requirements.md の3基準(秘密情報を書かない・正確な前提・snippet は参照)を設計の対象とする。

## 対象の概要

security-requirements.md のとおり、docs のセキュリティは正確さに集約される。

## 設計

- **秘密情報**: 手順にはパスとコマンドのみを書き、credential の取得・保存方法は書かない(security-requirements.md §脅威モデルと基準の設計意図)
- **前提**: バージョン値は doctor フロアと同じ値を1箇所に明記し、未検証環境の動作を示唆しない(security-requirements.md §脅威モデルと基準)
- **snippet 参照**: hook 配線内容は `dist/kimi` の snippet 正本への参照とし、docs への転記で陳腐化したコマンドを残さない(security-requirements.md §脅威モデルと基準)
