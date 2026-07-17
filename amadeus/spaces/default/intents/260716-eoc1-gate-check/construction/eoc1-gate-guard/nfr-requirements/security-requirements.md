# Security Requirements — eoc1-gate-guard

## 上流入力(consumes 全数)

`../functional-design/business-rules.md`(BR-1〜7)、`../../../inception/requirements-analysis/requirements.md`、`../functional-design/business-logic-model.md`、codekb `technology-stack.md`(bun/TS 既決)。

## 要件

- SR-1: 検査は読み取り専用 — record への書き込み・外部通信なし(攻撃面の追加ゼロ)
- SR-2: questions 内容は正規表現照合のみで eval/実行しない(データ化)
- SR-3: パス構成は stage 解決由来のみ(ユーザー入力のパス連結なし — traversal 面なし)
