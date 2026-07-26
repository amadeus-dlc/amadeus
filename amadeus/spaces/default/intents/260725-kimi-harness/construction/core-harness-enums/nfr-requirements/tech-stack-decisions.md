上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Tech Stack Decisions — core-harness-enums

> 上流入力の使用箇所: business-rules.md の BR-1/BR-2/BR-3/BR-5、requirements.md の TC-4、technology-stack.md の既存構成を選択の根拠とする。

## 対象の概要

サンクション済み3箇所の列挙追加の技術選択。

## 選択

| 要素 | 決定 | 根拠 |
|---|---|---|
| 言語・実行 | TypeScript(bun) | technology-stack.md の既存基盤 |
| 編集形 | 既存行と同形の追加 | business-rules.md BR-1/BR-2(union・map・probe 順の既存形に倣う) |
| フロア値 | named constant(実測版) | business-rules.md BR-3(codex `MIN_CODEX` の流儀。TC-4) |
| swarm driver | subagent floor のみ | business-rules.md BR-5(ADR-6。ultra 系なし) |

## 却下

- kimi 固有の swarm driver: ADR-6 で却下(実効を検証不能)
- probe の強制化: advisory 維持(BR-4。hook は補助的機構)
