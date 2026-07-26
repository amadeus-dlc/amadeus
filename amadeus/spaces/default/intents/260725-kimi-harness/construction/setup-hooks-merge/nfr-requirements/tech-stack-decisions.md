上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Tech Stack Decisions — setup-hooks-merge

> 上流入力の使用箇所: business-rules.md の BR-6、business-logic-model.md のマージフロー、requirements.md の FR-3b、technology-stack.md の既存インストーラ構成を選択の根拠とする。

## 選択

| 要素 | 決定 | 根拠 |
|---|---|---|
| 言語・実行 | TypeScript(bun) | technology-stack.md の既存基盤 |
| 配置 | `packages/setup/src/domain/kimi-hooks.ts` + `modules/kimi-hooks.ts` | domain=純粋ロジック、modules=組込みの分離(business-rules.md の BR 群が全て domain 側で検証可能な構造) |
| TOML 処理 | 最小の構造的処理(マーカー基準の文字列処理) | business-rules.md BR-1/BR-2(ブロック外バイト保持のため、full parse より構造的文字列処理が安全) |
| UX | 既存流儀(plan report + wizard confirm) | business-rules.md BR-6(ADR-5) |
| 書込み | 既存 apply-write port(atomic) | business-rules.md BR-4 |

## 却下

- TOML パーサライブラリの新規導入: マーカー基準で足り、依存を増やさない
- kimi 独自の確認 UI: BR-6 で禁止
