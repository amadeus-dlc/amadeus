上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Tech Stack Decisions — distribution-enumeration

> 上流入力の使用箇所: business-rules.md の BR-1/BR-2/BR-3、business-logic-model.md の列挙フロー、requirements.md の FR-5、technology-stack.md の既存構成(Bun/TS)を選択の根拠とする。

## 対象の概要

列挙追加の技術選択(新規技術の導入なし)。

## 選択

| 要素 | 決定 | 根拠 |
|---|---|---|
| 言語・実行 | TypeScript(bun) | 既存基盤 |
| 編集形 | 既存の列挙への同形追加 | business-rules.md BR-1(原子性のスコープ内で一貫) |
| 検証 | 既存基準(typecheck/lint/dist:check/promote:self:check/tests) | business-rules.md BR-3(project.md Testing Posture) |
| 生成 | package.ts / promote-self のみ | business-rules.md BR-2(生成物を手編集しない) |

## 却下

- 列挙の自動検出化(設定の外部化): 既存の閉集合パターンを維持(新規機構なし)
