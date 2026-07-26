上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Logical Components — kimi-live-journey

> 上流入力の使用箇所: tech-stack-decisions.md §選択(`kimi -p`・隔離・ゲートの既存様式)と business-logic-model.md §driver フローを構造の根拠とする。

## 対象の概要

本 Unit の論理構成は「driver(プリミティブ) → journey(配置+呼出+断言) → 記録(実走ログ)」の3段。

## 構成

| 論理部品 | 役割 | 対応する実体 |
|---|---|---|
| driver | `kimi -p` の spawn + 回収 + skipReason | `tests/harness/kimi-print-drive.ts` |
| journey | tmp 配置・`KIMI_CODE_HOME` 注入・呼出・断言 | `tests/e2e/t-print-kimi-*.serial.test.ts` |
| 記録 | 実走の stdout/exit/理由の保存 | journey 内の証跡出力 |

## 関係

- journey は driver のみに依存し、kimi の内部知識を持たない(tech-stack-decisions.md §選択の駆動方式どおり)
- driver は既存 driver と同じポート形状(skipReason・env ゲート)で、独自の検査機構を足さない(business-rules.md BR-5 経由 — tech-stack-decisions.md §却下)
