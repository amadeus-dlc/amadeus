上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Security Requirements — kimi-hook-adapter

> 上流入力の使用箇所: business-rules.md の BR-2/BR-3/BR-4/BR-7、business-logic-model.md の live capture 手順、requirements.md の FR-2c/OC-1、technology-stack.md の bun 実行基盤を根拠とする。

## 脅威モデルと基準

- **payload の取り込み**: adapter は Kimi CLI からの stdin JSON を読むが、評価(eval)や動的ロードは行わず、構造化された parse のみ(未知フィールドは落とす — business-rules.md BR-2/BR-5)
- **秘密情報の非保持**: adapter は credential を一切扱わない(設計意図。credential は Kimi 側の credential store が管理し、amadeus は保持・出力しない — 既存の gh-scripts-boundary 規則と同型の方針)
- **presence の真正性**: mint は「実際に人間が応答したターン」に限り、機械注入のマーカー判定は core 側の既存分類器に委譲する(business-rules.md BR-4)
- **capture/probe の衛生**: live capture はバックアップ・マーカー・除去の手順で行い、managed block 以外を変更しない(business-rules.md BR-7、OC-1)

## コンプライアンス

該当なし(requirements.md §制約に規制項目は存在しない)。
