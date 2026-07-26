上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Tech Stack Decisions — kimi-harness-docs

> 上流入力の使用箇所: business-rules.md の BR-4/BR-5 と business-logic-model.md の執筆フロー・検証シーケンス、requirements.md の FR-8a を選択の根拠とする。

## 対象の概要

ドキュメントの形式選択(既存章の踏襲)。

## 選択

| 要素 | 決定 | 根拠 |
|---|---|---|
| 形式 | Markdown(en + ja 対) | business-rules.md BR-4(言語規則。既存章と同構造) |
| 構成 | prerequisites / install / hook wiring / doctor / what's different | business-logic-model.md §執筆フロー(既存章と同型) |
| 配置 | `docs/guide/harnesses/` + README 表 | requirements.md FR-8a |
| 検証 | リンク実在・dogfood 突合 | business-rules.md BR-5(実測に基づく)と business-logic-model.md §検証シーケンス(リンク切れなし・再現性) |

## 却下

- 自動生成(docs をコードから生成): 既存章は手書きの構造で、本 Unit でも同様に手書き(実測の転記が主)
