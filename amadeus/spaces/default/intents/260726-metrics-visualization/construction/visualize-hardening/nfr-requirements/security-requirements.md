# Security Requirements — U2 visualize-hardening

上流入力(consumes 全数): business-logic-model.md, business-rules.md, requirements.md, technology-stack.md

## セキュリティ要件

- U2-SEC-01: U1-SEC-01〜03 を継承(self-contained・全数エスケープ・秘密情報なし)。強調 class・凡例行(business-rules.md ルール12〜13)は静的文字列で新たな注入面を作らない
- U2-SEC-02: CI ステップ追加(増分4)は既存 job の permissions(contents: read+App token 経路)を変更しない — 新しい権限・secret を要求しない(requirements.md FR-5 の公開経路不変)
- U2-SEC-03: docs(増分5)に認証情報・内部パスの記載をしない(公開リポジトリの文書面)

## 非対象

- 依存監査の新設(依存追加ゼロ継続 — technology-stack.md)
