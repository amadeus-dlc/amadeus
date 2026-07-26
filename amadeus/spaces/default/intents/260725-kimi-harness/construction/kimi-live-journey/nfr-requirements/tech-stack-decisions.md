上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Tech Stack Decisions — kimi-live-journey

> 上流入力の使用箇所: business-rules.md の BR-5(既存 driver と同じポート形状)、business-logic-model.md の driver フロー、requirements.md の FR-9a を選択の根拠とする。

## 対象の概要

live driver の技術選択(既存 driver パターンの踏襲)。

## 選択

| 要素 | 決定 | 根拠 |
|---|---|---|
| 言語・実行 | TypeScript(bun test ベースの既存ランナー) | technology-stack.md のテスト構成(Bun ランー・4層)に従う |
| 駆動方式 | `kimi -p` 非対話モード | business-logic-model.md §driver フロー(TUI 駆動より安価。docs 確認済み) |
| 隔離 | `KIMI_CODE_HOME` 差替 | business-logic-model.md §hermeticity の機構 |
| ゲート | `AMADEUS_KIMI_PRINT_LIVE=1` + skipReason | business-rules.md BR-1/BR-5(既存 e2e 様式) |

## 却下

- TUI 駆動(tmux 系): technology-stack.md が記録する既存の journey 系(Kiro ACP trace・Claude SDK/TUI journey)はあるが、kimi は `-p` で足り、コストと安定性で優る
- 独自の検査機構: BR-5 で禁止(既存 driver の形状を守る)
