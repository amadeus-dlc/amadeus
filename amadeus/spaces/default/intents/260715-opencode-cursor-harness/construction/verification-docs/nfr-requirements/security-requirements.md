# Security Requirements — U4 verification-docs

intent: 260715-opencode-cursor-harness / Unit: U4
上流入力: functional-design(business-logic-model.md / business-rules.md)、requirements.md、codekb の technology-stack.md(Bun/TS スタック実測)。

## 要件

- SR-U4-1: docs に実在の認証情報・内部 URL を記載しない(例示はプレースホルダ)
- SR-U4-2: 権限モデル差の記載(opencode 既定全許可)は事実記述+絞り込み例への参照に留める(R-4 緩和の文書面)

## N/A(反証可能根拠付き)

- 入力サニタイズ・認可: N/A — テスト(読み取り)と docs のみ
