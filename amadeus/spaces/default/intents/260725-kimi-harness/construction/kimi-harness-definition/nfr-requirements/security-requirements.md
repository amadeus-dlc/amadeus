上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Security Requirements — kimi-harness-definition

> 上流入力の使用箇所: business-rules.md の BR-4(snippet 単一ソース)と BR-7(生成物を手編集しない)、requirements.md の FR-1、technology-stack.md の供給面(bun 直実行・依存なし)を根拠とする。

## 脅威モデルと基準

- 生成物(dist/kimi)は静的ファイル群で、実行時の認証・認可の対象を持たない
- snippet 正本の内容は managed block の設計どおりで、秘密情報を含まない(配線対象は `bun .kimi-code/...` のコマンド行のみで、credential は設計に登場しない)
- `dist/kimi/` は生成物であり手編集を禁止(business-rules.md BR-7) — 改ざんは byte-parity guard で検出される

## コンプライアンス

該当なし(requirements.md §制約には TC(技術)・OC(組織)・CC(コスト)のみで、規制項目は存在しない)。
