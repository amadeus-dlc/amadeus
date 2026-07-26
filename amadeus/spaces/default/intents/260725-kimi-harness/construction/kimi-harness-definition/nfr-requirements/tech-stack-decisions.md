上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Tech Stack Decisions — kimi-harness-definition

> 上流入力の使用箇所: business-rules.md の BR-1〜BR-3、business-logic-model.md の生成フロー、requirements.md の FR-1、technology-stack.md の既存構成を選択の根拠とする。

## 選択

| 要素 | 決定 | 根拠 |
|---|---|---|
| 言語・実行 | TypeScript(bun 直実行) | technology-stack.md の既存基盤。新規依存なし |
| 定義形式 | manifest.ts(宣言的 DATA) | business-rules.md BR-3(ロジック非保持。09-porting 契約) |
| 生成 | packager 既定(runner-gen・graph compile) | business-rules.md BR-1(emit なし — ADR-2 の実測で寛容性確認済み) |
| 配置 | `.kimi-code/` | business-rules.md BR-1(harnessDir。ADR-1 の3系統実測) |

## 却下

- 新規ランタイム依存の追加: なし(既存の bun-only 前提を変更しない — project.md Forbidden)
- emit.ts の新設: ADR-2 で却下(frontmatter 制御が不要と実測済み)
