上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Security Design — kimi-harness-definition

> 上流入力の使用箇所: security-requirements.md の脅威モデル(静的ファイル・秘密情報なし・改ざんは byte-parity で検出)を設計の前提とする。

## 対象の概要

security-requirements.md のとおり、本 Unit は静的な生成物で認証・認可の対象を持たない。

## 設計

- **改ざん検出**: `package.ts kimi --check` の byte-parity をセキュリティ機構として位置づける(生成物と正本の一致を CI で保証)
- **秘密情報の非含有**: snippet 正本は `bun .kimi-code/...` のコマンド行のみを含み、credential を持たない(security-requirements.md §脅威モデルのとおり設計に登場しない)
