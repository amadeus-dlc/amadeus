# Reliability Requirements — U4 verification-docs

intent: 260715-opencode-cursor-harness / Unit: U4
上流入力: functional-design(business-logic-model.md / business-rules.md)、requirements.md、codekb の technology-stack.md(Bun/TS スタック実測)(R-U4-1 落ちる実証)。

## 要件

- RL-U4-1: smoke は「落ちる実証」済みでのみ完成(R-U4-1 — 偽 green の構造排除)
- RL-U4-2: 機能単位表は実測出典に紐づく(R-U4-2 — 推測記載の禁止で文書の信頼性を担保)
- RL-U4-3: registry 再生成後の FRESHNESS DIFF green(R-U4-5)

## N/A(反証可能根拠付き)

- 可用性 SLO: N/A — テスト・docs のみ
