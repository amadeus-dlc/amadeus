上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Reliability Design — kimi-live-journey

> 上流入力の使用箇所: reliability-requirements.md の3機構(skip・実行から導出・失敗は調査対象)を設計の対象とする。

## 対象の概要

reliability-requirements.md が定める信頼性を、driver と journey の実装設計に落とす。

## 設計

- **skipReason**: env(`AMADEUS_KIMI_PRINT_LIVE`)と kimi バイナリ実在の2条件で理由文字列を返す。暗黙の live 実行経路を作らない(reliability-requirements.md §信頼性の仕組み)
- **記録**: journey は実走の stdout/exit を保存し、断言はその内容に対して行う(business-rules.md BR-4 経由 — reliability-requirements.md §信頼性の仕組み)
- **失敗**: `kimi -p` の非ゼロ終了は journey 失敗として記録(advisory にしない — business-logic-model.md §決定木)
